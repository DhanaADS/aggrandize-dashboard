// File Upload Service for Todo Attachments
import { createClient } from '@/lib/supabase/client';
import { fallbackFileUploadService } from './file-upload-service-fallback';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  fileId?: string;
}

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  todoId?: string;
  commentId?: string;
}

class FileUploadService {
  private supabase = createClient();
  private readonly BUCKET_NAME = 'todo-attachments';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ];

  /**
   * Initialize the storage bucket if it doesn't exist
   */
  async initializeBucket(): Promise<void> {
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.find(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        const { error } = await this.supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });
        
        if (error) {
          console.error('Error creating bucket:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing bucket:', error);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
  }

  /**
   * Generate a unique file path
   */
  private generateFilePath(file: File, userEmail: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || '';
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${sanitizedEmail}/${timestamp}_${randomId}.${extension}`;
  }

  /**
   * Upload file - Uses fallback method to avoid Supabase Storage RLS issues
   */
  async uploadFile(
    file: File, 
    metadata: AttachmentMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    console.log('🔄 Starting file upload with RLS-safe fallback method');
    
    // Use the fallback service directly to avoid Storage RLS issues
    try {
      const result = await fallbackFileUploadService.uploadFile(file, metadata, onProgress);
      
      if (result.success) {
        console.log('✅ File upload successful using fallback method');
        return result;
      } else {
        console.error('❌ Fallback upload failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Upload service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: File[],
    baseMetadata: Omit<AttachmentMetadata, 'fileName' | 'fileSize' | 'fileType'>,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadata: AttachmentMetadata = {
        ...baseMetadata,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      const result = await this.uploadFile(file, metadata, (progress) => {
        onProgress?.(i, progress);
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get file info from database
      const { data: attachment, error: fetchError } = await this.supabase
        .from('todo_attachments')
        .select('file_url')
        .eq('id', fileId)
        .single();

      if (fetchError || !attachment) {
        return { success: false, error: 'File not found' };
      }

      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two parts

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('todo_attachments')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Delete file error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get file category based on MIME type
   */
  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
    return 'file';
  }

  /**
   * Generate thumbnail for images (client-side)
   */
  private async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set thumbnail size
        const maxSize = 200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(fileType: string): string {
    const category = this.getFileCategory(fileType);
    
    const icons = {
      image: '🖼️',
      video: '🎥',
      audio: '🎵',
      pdf: '📄',
      document: '📝',
      spreadsheet: '📊',
      presentation: '📋',
      archive: '📦',
      file: '📎'
    };

    return icons[category as keyof typeof icons] || icons.file;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
// FALLBACK File Upload Service - Bypasses Supabase Storage RLS Issues
// This version stores files as base64 in the database temporarily
import { createClient } from '@/lib/supabase/client';

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

class FallbackFileUploadService {
  private supabase = createClient();
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for base64 storage
  private readonly ALLOWED_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'text/plain', 'text/csv',
    // Small files only for base64 storage
  ];

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB for this fallback method`
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported in fallback mode'
      };
    }

    return { valid: true };
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Upload file using base64 storage (fallback method)
   */
  async uploadFile(
    file: File, 
    metadata: AttachmentMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    try {
      console.log('🔄 Using FALLBACK file upload (base64 storage)');
      
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Simulate progress for base64 conversion
      if (onProgress) {
        onProgress({ loaded: 0, total: file.size, percentage: 0 });
      }

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      if (onProgress) {
        onProgress({ loaded: file.size * 0.5, total: file.size, percentage: 50 });
      }

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(file);
      }

      if (onProgress) {
        onProgress({ loaded: file.size * 0.75, total: file.size, percentage: 75 });
      }

      // Save to database with base64 data
      const { data: attachmentData, error: dbError } = await this.supabase
        .from('todo_attachments')
        .insert({
          todo_id: metadata.todoId,
          comment_id: metadata.commentId,
          file_name: metadata.fileName,
          file_url: base64Data, // Store base64 directly
          file_type: this.getFileCategory(file.type),
          file_size: metadata.fileSize,
          thumbnail_url: thumbnailUrl,
          uploaded_by: metadata.uploadedBy
        })
        .select()
        .single();

      if (dbError) {
        console.error('Fallback database error:', dbError);
        return { success: false, error: 'Failed to save file data to database' };
      }

      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      console.log('✅ Fallback upload successful');
      return {
        success: true,
        fileUrl: base64Data,
        thumbnailUrl,
        fileId: attachmentData.id
      };

    } catch (error) {
      console.error('Fallback upload error:', error);
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
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('text')) return 'document';
    return 'file';
  }

  /**
   * Generate thumbnail for images
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
      pdf: '📄',
      document: '📝',
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

  /**
   * Download file (for base64 stored files)
   */
  downloadFile(fileUrl: string, fileName: string) {
    if (fileUrl.startsWith('data:')) {
      // Base64 file - create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Regular URL
      window.open(fileUrl, '_blank');
    }
  }
}

// Export singleton instance
export const fallbackFileUploadService = new FallbackFileUploadService();
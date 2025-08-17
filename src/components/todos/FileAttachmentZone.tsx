'use client';

import { useState, useRef, useCallback } from 'react';
import { fileUploadService, FileUploadResult, UploadProgress } from '@/lib/file-upload-service';

interface FileAttachmentZoneProps {
  todoId?: string;
  commentId?: string;
  currentUser: string;
  onUploadComplete?: (results: FileUploadResult[]) => void;
  onUploadProgress?: (fileIndex: number, progress: UploadProgress) => void;
  className?: string;
  maxFiles?: number;
  compact?: boolean;
}

interface FileWithProgress {
  file: File;
  progress: number;
  uploading: boolean;
  result?: FileUploadResult;
  error?: string;
}

export default function FileAttachmentZone({
  todoId,
  commentId,
  currentUser,
  onUploadComplete,
  onUploadProgress,
  className = '',
  maxFiles = 10,
  compact = false
}: FileAttachmentZoneProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.slice(0, maxFiles - files.length);
    const filesWithProgress: FileWithProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      uploading: false
    }));

    setFiles(prev => [...prev, ...filesWithProgress]);
  }, [files.length, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const results: FileUploadResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileWithProgress = files[i];
        
        // Skip already uploaded files
        if (fileWithProgress.result?.success) {
          results.push(fileWithProgress.result);
          continue;
        }

        // Update file as uploading
        setFiles(prev => prev.map((f, index) => 
          index === i ? { ...f, uploading: true, progress: 0 } : f
        ));

        try {
          const result = await fileUploadService.uploadFile(
            fileWithProgress.file,
            {
              fileName: fileWithProgress.file.name,
              fileSize: fileWithProgress.file.size,
              fileType: fileWithProgress.file.type,
              uploadedBy: currentUser,
              todoId,
              commentId
            },
            (progress) => {
              setFiles(prev => prev.map((f, index) => 
                index === i ? { ...f, progress: progress.percentage } : f
              ));
              onUploadProgress?.(i, progress);
            }
          );

          // Update file with result
          setFiles(prev => prev.map((f, index) => 
            index === i ? { 
              ...f, 
              uploading: false, 
              progress: 100, 
              result,
              error: result.success ? undefined : result.error 
            } : f
          ));

          results.push(result);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          setFiles(prev => prev.map((f, index) => 
            index === i ? { 
              ...f, 
              uploading: false, 
              progress: 0, 
              error: errorMessage 
            } : f
          ));

          results.push({ success: false, error: errorMessage });
        }
      }

      onUploadComplete?.(results);

    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    return fileUploadService.getFileIcon(fileType);
  };

  const formatFileSize = (bytes: number) => {
    return fileUploadService.formatFileSize(bytes);
  };

  const hasFiles = files.length > 0;
  const hasFailures = files.some(f => f.error);
  const allUploaded = files.every(f => f.result?.success);
  const someUploading = files.some(f => f.uploading);

  if (compact && !hasFiles) {
    return (
      <div className={className}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition-colors text-sm"
        >
          <span>📎</span>
          <span>Attach</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className={`${className} space-y-4`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-blue-400 bg-blue-500/10 scale-105'
            : 'border-white/30 hover:border-white/50 hover:bg-white/5'
        }`}
      >
        <div className="space-y-3">
          <div className="text-4xl opacity-60">
            {isDragOver ? '⬇️' : '📎'}
          </div>
          <div className="text-white/80">
            <p className="font-medium">
              {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-sm text-white/60 mt-1">
              Support images, documents, videos and more • Max {maxFiles} files
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium text-sm">
              Attached Files ({files.length})
            </h4>
            {!allUploaded && (
              <button
                onClick={uploadFiles}
                disabled={isUploading || files.length === 0}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                {someUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>⬆️</span>
                    Upload {files.filter(f => !f.result?.success).length} files
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((fileWithProgress, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
              >
                {/* File Icon */}
                <div className="text-2xl flex-shrink-0">
                  {getFileIcon(fileWithProgress.file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm truncate">
                      {fileWithProgress.file.name}
                    </p>
                    <span className="text-white/60 text-xs ml-2">
                      {formatFileSize(fileWithProgress.file.size)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {fileWithProgress.uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileWithProgress.progress}%` }}
                        />
                      </div>
                      <p className="text-white/60 text-xs mt-1">
                        {Math.round(fileWithProgress.progress)}% uploaded
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {fileWithProgress.result?.success && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-green-400 text-xs">✅</span>
                      <span className="text-green-400 text-xs">Uploaded successfully</span>
                    </div>
                  )}

                  {/* Error */}
                  {fileWithProgress.error && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-red-400 text-xs">❌</span>
                      <span className="text-red-400 text-xs">{fileWithProgress.error}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!fileWithProgress.uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-white/60 hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {hasFailures && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-400 text-sm font-medium">
                  Some files failed to upload. Please try again.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
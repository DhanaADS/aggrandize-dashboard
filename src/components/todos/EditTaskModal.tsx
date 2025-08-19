'use client';

import { useState, useEffect, useRef } from 'react';
import { Todo, TodoAttachment, UpdateTodoRequest, TodoPriority, TodoCategory, TeamMember, PRIORITY_CONFIG } from '@/types/todos';
import { todoAttachmentsApi } from '@/lib/todos-api';
import { fileUploadService } from '@/lib/file-upload-service';

interface EditTaskModalProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (todoId: string, updates: UpdateTodoRequest) => Promise<void>;
  teamMembers: TeamMember[];
  currentUser: string;
}

const CATEGORIES: TodoCategory[] = ['general', 'work', 'meeting', 'review', 'bug', 'feature'];

export default function EditTaskModal({
  todo,
  isOpen,
  onClose,
  onSave,
  teamMembers,
  currentUser
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [category, setCategory] = useState<TodoCategory>('general');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // File management state
  const [attachments, setAttachments] = useState<TodoAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with current todo data
  useEffect(() => {
    if (todo && isOpen) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setPriority(todo.priority);
      setCategory(todo.category);
      setSelectedAssignees(todo.assigned_to_array || (todo.assigned_to ? [todo.assigned_to] : []));
      setDueDate(todo.due_date ? todo.due_date.split('T')[0] : '');
      
      // Load existing attachments
      loadAttachments();
    }
  }, [todo, isOpen]);

  const loadAttachments = async () => {
    if (!todo?.id) return;
    
    setLoadingAttachments(true);
    try {
      const taskAttachments = await todoAttachmentsApi.getTaskAttachments(todo.id);
      setAttachments(taskAttachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Close modal on escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const updates: UpdateTodoRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        assigned_to_array: selectedAssignees,
        due_date: dueDate || undefined,
      };

      await onSave(todo.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to edit task:', error);
      alert('Failed to edit task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAssignee = (email: string) => {
    setSelectedAssignees(prev =>
      prev.includes(email)
        ? prev.filter(a => a !== email)
        : [...prev, email]
    );
  };

  // File management functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadingFiles(files);
    }
  };

  const uploadNewFiles = async () => {
    if (uploadingFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      for (const file of uploadingFiles) {
        await fileUploadService.uploadFile(file, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy: currentUser,
          todoId: todo.id
        });
      }
      
      // Reload attachments after upload
      await loadAttachments();
      setUploadingFiles([]);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      await fileUploadService.deleteFile(attachmentId);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const downloadAttachment = (attachment: TodoAttachment) => {
    if (attachment.file_url.startsWith('data:')) {
      // Base64 file
      const link = document.createElement('a');
      link.href = attachment.file_url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Regular URL
      window.open(attachment.file_url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(15px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: '#0f0f0f',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '0'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>
            Edit Task
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '1rem'
              }}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add task description..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              maxLength={500}
            />
          </div>

          {/* Priority and Category */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255, 255, 255, 0.8)', 
                marginBottom: '0.5rem',
                fontSize: '0.9rem'
              }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TodoPriority)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key} style={{ backgroundColor: '#1a1a1a' }}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255, 255, 255, 0.8)', 
                marginBottom: '0.5rem',
                fontSize: '0.9rem'
              }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TodoCategory)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ backgroundColor: '#1a1a1a' }}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Assignees */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Assign to Team Members
            </label>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.5rem'
            }}>
              {teamMembers.map((member) => (
                <button
                  key={member.email}
                  type="button"
                  onClick={() => toggleAssignee(member.email)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: selectedAssignees.includes(member.email) 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    color: selectedAssignees.includes(member.email) 
                      ? '#60a5fa' 
                      : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {selectedAssignees.includes(member.email) ? '✓ ' : ''}{member.name}
                </button>
              ))}
            </div>
          </div>

          {/* File Management Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.8)', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Attachments
            </label>
            
            {/* Existing Attachments */}
            {loadingAttachments ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.9rem'
              }}>
                Loading attachments...
              </div>
            ) : attachments.length > 0 ? (
              <div style={{ 
                marginBottom: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 600
                }}>
                  CURRENT FILES
                </div>
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {fileUploadService.getFileIcon(attachment.file_type)}
                      </span>
                      <div>
                        <div style={{ 
                          color: 'white', 
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }}>
                          {attachment.file_name}
                        </div>
                        <div style={{ 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          fontSize: '0.75rem'
                        }}>
                          {fileUploadService.formatFileSize(attachment.file_size)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => downloadAttachment(attachment)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this file?')) {
                            deleteAttachment(attachment.id);
                          }
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}>
                No files attached
              </div>
            )}

            {/* Upload New Files */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              />
              
              {uploadingFiles.length > 0 && (
                <div style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ color: '#60a5fa', marginBottom: '0.25rem' }}>
                    Ready to upload {uploadingFiles.length} file(s):
                  </div>
                  {uploadingFiles.map((file, index) => (
                    <div key={index} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      • {file.name} ({fileUploadService.formatFileSize(file.size)})
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  📎 Select Files
                </button>
                
                {uploadingFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={uploadNewFiles}
                    disabled={isUploading}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isUploading ? 'rgba(107, 114, 128, 0.5)' : '#10b981',
                      color: 'white',
                      cursor: isUploading ? 'default' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  >
                    {isUploading ? 'Uploading...' : '⬆️ Upload'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1.5rem', 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: title.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)',
              color: 'white',
              cursor: (isSaving || !title.trim()) ? 'default' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
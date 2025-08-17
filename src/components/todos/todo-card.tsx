'use client';

import { useState } from 'react';
import { Todo, UpdateTodoRequest, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/todos';
import { todoUtils } from '@/lib/todos-api';
import styles from './todo-card.module.css';

interface TodoCardProps {
  todo: Todo;
  onUpdate: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComment?: (id: string, comment: string) => Promise<void>;
  showAssignee?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

export function TodoCard({ 
  todo, 
  onUpdate, 
  onDelete, 
  onComment, 
  showAssignee = true, 
  showProgress = true,
  compact = false 
}: TodoCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[todo.priority];
  const statusConfig = STATUS_CONFIG[todo.status];
  const categoryConfig = CATEGORY_CONFIG[todo.category];
  const isOverdue = todoUtils.isOverdue(todo);
  const daysUntilDue = todoUtils.getDaysUntilDue(todo);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdate(todo.id, { status: newStatus as any });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    setIsUpdating(true);
    try {
      const updates: UpdateTodoRequest = { progress: newProgress };
      if (newProgress === 100) {
        updates.status = 'done';
      } else if (todo.status === 'done' && newProgress < 100) {
        updates.status = 'in_progress';
      }
      await onUpdate(todo.id, updates);
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!onComment || !newComment.trim()) return;
    
    try {
      await onComment(todo.id, newComment.trim());
      setNewComment('');
      setShowCommentForm(false);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      try {
        await onDelete(todo.id);
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    }
  };

  return (
    <div className={`${styles.todoCard} ${compact ? styles.compact : ''} ${isOverdue ? styles.overdue : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.categoryBadge} style={{ backgroundColor: categoryConfig.color }}>
            {categoryConfig.icon} {categoryConfig.label}
          </div>
          <div className={styles.priorityBadge} style={{ backgroundColor: priorityConfig.color }}>
            {priorityConfig.icon} {priorityConfig.label}
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {todo.is_team_todo && (
            <span className={styles.teamBadge}>👥 Team</span>
          )}
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className={styles.expandButton}
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {/* Title and Description */}
      <div className={styles.content}>
        <h3 className={styles.title}>{todo.title}</h3>
        {todo.description && (
          <p className={styles.description}>{todo.description}</p>
        )}
      </div>

      {/* Status and Progress */}
      <div className={styles.statusSection}>
        <div className={styles.statusProgress}>
          <select 
            value={todo.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={styles.statusSelect}
            disabled={isUpdating}
            style={{ backgroundColor: statusConfig.color }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>

          {showProgress && (
            <div className={styles.progressContainer}>
              <input
                type="range"
                min="0"
                max="100"
                value={todo.progress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className={styles.progressSlider}
                disabled={isUpdating}
              />
              <span className={styles.progressText}>{todo.progress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Due Date */}
      {todo.due_date && (
        <div className={`${styles.dueDate} ${isOverdue ? styles.overdueBadge : ''}`}>
          📅 {todoUtils.formatDueDate(todo.due_date)}
          {daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue > 0 && (
            <span className={styles.urgentBadge}>⚠️ Due soon</span>
          )}
        </div>
      )}

      {/* Assignee */}
      {showAssignee && todo.assigned_to && (
        <div className={styles.assignee}>
          👤 Assigned to: <strong>{todoUtils.getTeamMemberName(todo.assigned_to)}</strong>
        </div>
      )}

      {/* Tags */}
      {todo.tags && todo.tags.length > 0 && (
        <div className={styles.tags}>
          {todo.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {showDetails && (
        <div className={styles.details}>
          <div className={styles.metadata}>
            <div>
              <strong>Created by:</strong> {todoUtils.getTeamMemberName(todo.created_by)}
            </div>
            <div>
              <strong>Created:</strong> {new Date(todo.created_at).toLocaleDateString()}
            </div>
            {todo.updated_at !== todo.created_at && (
              <div>
                <strong>Updated:</strong> {new Date(todo.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {onComment && (
              <button 
                onClick={() => setShowCommentForm(!showCommentForm)}
                className={styles.actionButton}
              >
                💬 Comment
              </button>
            )}
            
            <button 
              onClick={handleDelete}
              className={styles.deleteButton}
            >
              🗑️ Delete
            </button>
          </div>

          {/* Comment Form */}
          {showCommentForm && onComment && (
            <div className={styles.commentForm}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className={styles.commentInput}
                rows={3}
              />
              <div className={styles.commentActions}>
                <button 
                  onClick={handleAddComment}
                  className={styles.commentSubmit}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </button>
                <button 
                  onClick={() => setShowCommentForm(false)}
                  className={styles.commentCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isUpdating && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
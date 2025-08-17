'use client';

import { useState } from 'react';
import { CreateTodoRequest, UpdateTodoRequest, Todo, PRIORITY_CONFIG, CATEGORY_CONFIG } from '@/types/todos';
import styles from './todo-form.module.css';

interface TodoFormProps {
  todo?: Todo;
  onSubmit: (data: CreateTodoRequest | UpdateTodoRequest) => Promise<void>;
  onCancel: () => void;
  teamMembers: string[];
}

export function TodoForm({ todo, onSubmit, onCancel, teamMembers }: TodoFormProps) {
  const [formData, setFormData] = useState({
    title: todo?.title || '',
    description: todo?.description || '',
    assigned_to: todo?.assigned_to || '',
    category: todo?.category || 'general',
    priority: todo?.priority || 'medium',
    due_date: todo?.due_date ? todo.due_date.split('T')[0] : '',
    is_team_todo: todo?.is_team_todo || false,
    tags: todo?.tags?.join(', ') || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.todoForm}>
      <div className={styles.header}>
        <h2>{todo ? 'Edit Todo' : 'Create New Todo'}</h2>
        <button onClick={onCancel} className={styles.closeButton}>✕</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Title */}
        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={styles.input}
            placeholder="What needs to be done?"
            required
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.textarea}
            rows={3}
            placeholder="Add more details..."
          />
        </div>

        {/* Row 1: Category and Priority */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className={styles.select}
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="priority" className={styles.label}>
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className={styles.select}
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Assignee and Due Date */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="assigned_to" className={styles.label}>
              Assign To
            </label>
            <select
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className={styles.select}
            >
              <option value="">Unassigned</option>
              {teamMembers.map(email => (
                <option key={email} value={email}>
                  {email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="due_date" className={styles.label}>
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className={styles.input}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Tags */}
        <div className={styles.field}>
          <label htmlFor="tags" className={styles.label}>
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className={styles.input}
            placeholder="Enter tags separated by commas"
          />
          <small className={styles.hint}>
            e.g., urgent, frontend, review
          </small>
        </div>

        {/* Team Todo Checkbox */}
        <div className={styles.checkboxField}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.is_team_todo}
              onChange={(e) => setFormData({ ...formData, is_team_todo: e.target.checked })}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              👥 This is a team todo (visible to all team members)
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !formData.title.trim()}
          >
            {isSubmitting ? (
              <>
                <div className={styles.spinner} />
                {todo ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {todo ? '💾 Update Todo' : '➕ Create Todo'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
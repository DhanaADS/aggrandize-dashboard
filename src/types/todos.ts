// AGGRANDIZE Team Todos - TypeScript Types

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoStatus = 'assigned' | 'in_progress' | 'pending_approval' | 'done' | 'blocked' | 'cancelled';
export type TodoCategory = 'general' | 'work' | 'meeting' | 'review' | 'bug' | 'feature';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  
  // Assignment & Ownership
  created_by: string; // User email
  assigned_to?: string; // User email (legacy - for backward compatibility)
  assigned_to_array?: string[]; // Multiple assignees
  
  // Categorization
  category: TodoCategory;
  priority: TodoPriority;
  
  // Status & Progress
  status: TodoStatus;
  progress: number; // 0-100
  
  // Timing
  due_date?: string; // ISO string
  start_date: string; // ISO string
  completed_at?: string; // ISO string
  
  // Metadata
  tags?: string[];
  is_team_todo: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  
  // Multi-assignee status tracking
  assignee_statuses?: TodoAssigneeStatus[];
  overall_progress?: number; // Calculated from all assignee progress
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_edited_at?: string; // When task was last edited
  last_edited_by?: string; // Who last edited the task
}

// Individual assignee status tracking
export interface TodoAssigneeStatus {
  id: string;
  todo_id: string;
  assignee_email: string;
  status: TodoStatus;
  progress: number; // 0-100
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TodoComment {
  id: string;
  todo_id: string;
  comment_by: string; // User email
  comment: string;
  created_at: string;
}

export interface TodoAttachment {
  id: string;
  todo_id: string;
  comment_id?: string;
  file_name: string;
  file_url: string;
  file_type: string; // Category: image, pdf, document, etc.
  file_size: number;
  thumbnail_url?: string;
  uploaded_by: string; // User email
  created_at: string;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  assigned_to?: string; // Legacy single assignment
  assigned_to_array?: string[]; // Multiple assignees
  category?: TodoCategory;
  priority?: TodoPriority;
  due_date?: string;
  tags?: string[];
  is_team_todo?: boolean;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  assigned_to?: string; // Legacy single assignment
  assigned_to_array?: string[]; // Multiple assignees
  category?: TodoCategory;
  priority?: TodoPriority;
  status?: TodoStatus;
  progress?: number;
  due_date?: string;
  tags?: string[];
  is_team_todo?: boolean;
}

export interface TodoFilters {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  category?: TodoCategory[];
  assigned_to?: string[];
  created_by?: string[];
  is_team_todo?: boolean;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  by_priority: Record<TodoPriority, number>;
  by_status: Record<TodoStatus, number>;
  by_category: Record<TodoCategory, number>;
}

// UI Component Props
export interface TodoCardProps {
  todo: Todo;
  onUpdate: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComment: (id: string, comment: string) => Promise<void>;
  showAssignee?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

export interface TodoFormProps {
  todo?: Todo; // For editing
  onSubmit: (todo: CreateTodoRequest | UpdateTodoRequest) => Promise<void>;
  onCancel: () => void;
  teamMembers: string[];
}

// Chat-style todo interfaces
export interface ChatTodoBubbleProps {
  todo: Todo;
  currentUser: string;
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onAssigneeStatusUpdate: (todoId: string, assigneeEmail: string, status: TodoStatus, progress?: number) => Promise<void>;
}

export interface QuickCreateTodoProps {
  onSubmit: (todo: CreateTodoRequest) => Promise<void>;
  currentUser: string;
  teamMembers: TeamMember[];
}

export interface AssigneeStatusProps {
  assigneeStatuses: TodoAssigneeStatus[];
  currentUser: string;
  onStatusUpdate: (assigneeEmail: string, status: TodoStatus, progress?: number) => Promise<void>;
}

export interface TodoListProps {
  todos: Todo[];
  filters: TodoFilters;
  onFilterChange: (filters: TodoFilters) => void;
  onTodoUpdate: (id: string, updates: UpdateTodoRequest) => Promise<void>;
  onTodoDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

// Team member interface for assignments
export interface TeamMember {
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

// Priority and status configurations - Chat-style with clear color coding
export const PRIORITY_CONFIG: Record<TodoPriority, { 
  label: string; 
  color: string; 
  icon: string;
  order: number;
  bgColor: string; // Background color for chat bubbles
  borderColor: string; // Border color for priority tags
}> = {
  urgent: { 
    label: 'Urgent', 
    color: '#dc2626', 
    icon: '🚨', 
    order: 1, // Highest priority - appears first
    bgColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.4)'
  },
  high: { 
    label: 'High', 
    color: '#ef4444', 
    icon: '🔴', 
    order: 2, // Second priority
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  medium: { 
    label: 'Normal', 
    color: '#f59e0b', 
    icon: '🟡', 
    order: 3, // Third priority
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  low: { 
    label: 'Low', 
    color: '#10b981', 
    icon: '🟢', 
    order: 4, // Lowest priority - appears last
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  }
};

export const STATUS_CONFIG: Record<TodoStatus, { 
  label: string; 
  color: string; 
  icon: string;
  order: number;
  emoji: string; // For quick reactions
}> = {
  assigned: { label: 'ASSIGNED', color: '#6b7280', icon: '📋', order: 1, emoji: '📝' },
  in_progress: { label: 'PROCESSING', color: '#3b82f6', icon: '⚡', order: 2, emoji: '⚡' },
  pending_approval: { label: 'PENDING', color: '#f59e0b', icon: '⏳', order: 3, emoji: '⏳' },
  done: { label: 'DONE', color: '#10b981', icon: '✅', order: 4, emoji: '✅' },
  blocked: { label: 'BLOCKED', color: '#ef4444', icon: '🚫', order: 5, emoji: '🚫' },
  cancelled: { label: 'CANCELLED', color: '#6b7280', icon: '❌', order: 6, emoji: '❌' }
};

export const CATEGORY_CONFIG: Record<TodoCategory, { 
  label: string; 
  color: string; 
  icon: string;
}> = {
  general: { label: 'General', color: '#6b7280', icon: '📌' },
  work: { label: 'Work', color: '#3b82f6', icon: '💼' },
  meeting: { label: 'Meeting', color: '#f59e0b', icon: '🤝' },
  review: { label: 'Review', color: '#8b5cf6', icon: '📊' },
  bug: { label: 'Bug Fix', color: '#ef4444', icon: '🐛' },
  feature: { label: 'Feature', color: '#10b981', icon: '✨' }
};

export const TEAM_MEMBERS: TeamMember[] = [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhana', role: 'admin' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera', role: 'marketing' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana', role: 'marketing' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran', role: 'marketing' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas', role: 'processing' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul', role: 'processing' }
];
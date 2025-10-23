'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { Todo, TodoStatus, TodoComment } from '@/types/todos';
import { todosApi, todoCommentsApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { hybridRealtime } from '@/lib/hybrid-realtime';
import { notificationSounds } from '@/lib/notification-sounds';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Avatar,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Badge,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  CheckCircle as DoneIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityIcon
} from '@mui/icons-material';

// Priority colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#ff4444';
    case 'high': return '#ff8800';
    case 'medium': return '#ffaa00';
    case 'low': return '#44aa44';
    default: return '#666666';
  }
};

// Status display
const getStatusInfo = (status: TodoStatus) => {
  switch (status) {
    case 'assigned': return { label: 'To Do', color: 'default', icon: '📋' };
    case 'in_progress': return { label: 'In Progress', color: 'primary', icon: '🚀' };
    case 'pending_approval': return { label: 'Review', color: 'warning', icon: '👀' };
    case 'done': return { label: 'Done', color: 'success', icon: '✅' };
    default: return { label: status.replace('_', ' '), color: 'default', icon: '📋' };
  }
};

const TaskCard = ({ task, onAction, onChat, unreadCount }: {
  task: Todo,
  onAction: (action: string) => void,
  onChat: (task: Todo) => void,
  unreadCount: number
}) => {
  const { user } = useAuth();
  const statusInfo = getStatusInfo(task.status);
  const isAssignee = task.assigned_to === user?.email || task.assigned_to_array?.includes(user?.email || '');
  const isCreator = task.created_by === user?.email;

  const getActionButtons = () => {
    if (task.status === 'assigned' && isAssignee) {
      return (
        <Button
          size="small"
          variant="contained"
          startIcon={<StartIcon />}
          onClick={() => onAction('start')}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Start
        </Button>
      );
    }
    if (task.status === 'in_progress' && isAssignee) {
      return (
        <Button
          size="small"
          variant="contained"
          startIcon={<DoneIcon />}
          onClick={() => onAction('complete')}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Done
        </Button>
      );
    }
    if (task.status === 'pending_approval' && isCreator) {
      return (
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<DoneIcon />}
          onClick={() => onAction('approve')}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Approve
        </Button>
      );
    }
    return null;
  };

  return (
    <Card sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box sx={{ fontSize: '1.2em', mt: -0.5 }}>{statusInfo.icon}</Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {task.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={statusInfo.label}
                color={statusInfo.color as any}
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getPriorityColor(task.priority)
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {task.priority}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {task.assigned_to_array?.join(', ') || task.assigned_to}
          </Typography>
        </Box>

        {task.due_date && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {unreadCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="primary">
              <ChatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Badge>
            <Typography variant="caption" color="text.secondary">
              {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        {getActionButtons()}
        <Button
          size="small"
          variant="outlined"
          startIcon={<ChatIcon />}
          onClick={() => onChat(task)}
          sx={{ ml: 'auto', minWidth: 'auto' }}
        >
          Chat
        </Button>
      </CardActions>
    </Card>
  );
};

const QuickTaskCreator = ({ open, onClose, onTaskCreated, teamMembers }: {
  open: boolean,
  onClose: () => void,
  onTaskCreated: () => void,
  teamMembers: any[]
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedAssignees.length === 0) return;

    setSubmitting(true);
    try {
      await todosApi.createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to_array: selectedAssignees,
        priority: 'medium',
        category: 'general',
        is_team_todo: true
      }, user?.email || '');
      onTaskCreated();
      onClose();
      setTitle('');
      setDescription('');
      setSelectedAssignees([]);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (email: string) => {
    setSelectedAssignees(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quick Create Task</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            autoFocus
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Add more details about this task..."
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Assign To (Multiple allowed)</InputLabel>
            <Select
              multiple
              value={selectedAssignees}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedAssignees(typeof value === 'string' ? [value] : value);
              }}
              label="Assign To (Multiple allowed)"
              renderValue={(selected) => {
                const selectedMembers = teamMembers.filter(m => selected.includes(m.email));
                return selectedMembers.map(m => m.name).join(', ');
              }}
            >
              {teamMembers.map(member => (
                <MenuItem key={member.email} value={member.email}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {member.name.charAt(0)}
                    </Avatar>
                    {member.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
            <Button onClick={onClose} sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!title.trim() || selectedAssignees.length === 0 || submitting}
              sx={{ flex: 1 }}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TaskChatDialog = ({ open, onClose, task, teamMembers }: {
  open: boolean,
  onClose: () => void,
  task: Todo | null,
  teamMembers: any[]
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task || !open) return;

    const loadComments = async () => {
      setLoading(true);
      try {
        const commentsData = await todoCommentsApi.getComments(task.id);
        setComments(commentsData);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [task, open]);

  // Real-time comment updates
  useEffect(() => {
    if (!task || !open || !user?.email) return;

    const handleCommentUpdate = (event: any) => {
      const { comment, todoId } = event.detail;
      if (comment && todoId === task.id) {
        // Add new comment if it's not already in the list
        setComments(prev => {
          const exists = prev.some(c => c.id === comment.id);
          if (!exists) {
            return [...prev, comment];
          }
          return prev;
        });
      }
    };

    window.addEventListener('hybrid-comment', handleCommentUpdate);
    return () => {
      window.removeEventListener('hybrid-comment', handleCommentUpdate);
    };
  }, [task, open, user?.email]);

  const handleSendMessage = async () => {
    if (!task || !newMessage.trim() || !user?.email) return;

    const tempComment: TodoComment = {
      id: `temp-${Date.now()}`,
      todo_id: task.id,
      comment: newMessage.trim(),
      comment_by: user.email,
      created_at: new Date().toISOString()
    };

    setComments(prev => [...prev, tempComment]);
    setNewMessage('');

    try {
      await todoCommentsApi.addComment(task.id, newMessage.trim(), user.email);
    } catch (error) {
      console.error('Failed to send message:', error);
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxHeight: '80vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          💬 <Typography variant="h6" component="span" noWrap sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {task.title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Task Discussion
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, p: 1 }}>
          {loading ? (
            <Typography align="center" color="text.secondary">Loading messages...</Typography>
          ) : comments.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
              No messages yet. Start the conversation!
            </Typography>
          ) : (
            comments.map(comment => {
              const member = teamMembers.find(m => m.email === comment.comment_by);
              const isOwnMessage = comment.comment_by === user?.email;

              return (
                <Box
                  key={comment.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: isOwnMessage ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1, maxWidth: '80%' }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                      {member?.name?.charAt(0) || '?'}
                    </Avatar>
                    <Paper
                      elevation={1}
                      sx={{
                        p: '8px 12px',
                        borderRadius: '16px',
                        borderTopLeftRadius: isOwnMessage ? '16px' : '4px',
                        borderTopRightRadius: isOwnMessage ? '4px' : '16px',
                        backgroundColor: isOwnMessage ? 'primary.main' : 'background.paper',
                        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body2">{comment.comment}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', opacity: 0.7, mt: 0.5 }}>
                        {new Date(comment.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Message Input */}
        <Box sx={{ display: 'flex', gap: 1, p: 1, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{ borderRadius: '20px', minWidth: 'auto', px: 3 }}
          >
            Send
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default function SimplifiedTeamHub() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'overdue' | 'completed'>('all');

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [userTodos, members] = await Promise.all([
        todosApi.getTodosForUser(user.email),
        getTeamMembersCached()
      ]);

      // Sort by priority (urgent > high > medium > low), then by newest
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const sortedTodos = userTodos.sort((a, b) => {
        const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
                           (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setTodos(sortedTodos);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { loadData(); }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    hybridRealtime.initialize(user.email);
    const handleTodoUpdate = () => loadData();
    window.addEventListener('hybrid-todo-update', handleTodoUpdate);
    window.addEventListener('hybrid-todo-insert', handleTodoUpdate);
    return () => {
      window.removeEventListener('hybrid-todo-update', handleTodoUpdate);
      window.removeEventListener('hybrid-todo-insert', handleTodoUpdate);
    };
  }, [user?.email, loadData]);

  const handleTaskAction = async (task: Todo, action: string) => {
    const statusMap = {
      start: 'in_progress' as TodoStatus,
      complete: 'done' as TodoStatus,
      approve: 'done' as TodoStatus
    };

    if (statusMap[action as keyof typeof statusMap]) {
      await todosApi.updateTodo(task.id, { status: statusMap[action as keyof typeof statusMap] }, user?.email || '');
      loadData();
    }
  };

  // Filter tasks
  const filteredTodos = todos.filter(task => {
    if (filter === 'mine') {
      return task.assigned_to === user?.email || task.assigned_to_array?.includes(user?.email || '');
    }
    if (filter === 'overdue') {
      return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    }
    if (filter === 'completed') {
      return task.status === 'done';
    }
    return true;
  });

  // Calculate stats
  const stats = {
    todo: todos.filter(t => t.status === 'assigned').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    done: todos.filter(t => t.status === 'done').length,
    total: todos.length
  };

  const completionRate = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Team Tasks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreator(true)}
        >
          New Task
        </Button>
      </Box>

      {/* Progress Summary */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Progress Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={`${stats.todo} To Do`} color="default" />
          <Chip label={`${stats.inProgress} In Progress`} color="primary" />
          <Chip label={`${stats.done} Done`} color="success" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={completionRate}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {Math.round(completionRate)}% Complete
          </Typography>
        </Box>
      </Paper>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant={filter === 'all' ? 'contained' : 'outlined'}
          onClick={() => setFilter('all')}
          size="small"
        >
          All Tasks ({stats.total})
        </Button>
        <Button
          variant={filter === 'mine' ? 'contained' : 'outlined'}
          onClick={() => setFilter('mine')}
          size="small"
        >
          My Tasks
        </Button>
        <Button
          variant={filter === 'completed' ? 'contained' : 'outlined'}
          onClick={() => setFilter('completed')}
          size="small"
          color="success"
        >
          Completed ({stats.done})
        </Button>
        <Button
          variant={filter === 'overdue' ? 'contained' : 'outlined'}
          onClick={() => setFilter('overdue')}
          size="small"
          color="error"
        >
          Overdue
        </Button>
      </Box>

      {/* Task List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Loading tasks...</Typography>
        </Box>
      ) : filteredTodos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          <Typography color="text.secondary">
            {filter === 'mine' ? 'You have no assigned tasks.' :
             filter === 'overdue' ? 'No overdue tasks!' :
             filter === 'completed' ? 'No completed tasks yet.' :
             'Create your first task to get started.'}
          </Typography>
        </Paper>
      ) : (
        <Box>
          {filteredTodos.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onAction={(action) => handleTaskAction(task, action)}
              onChat={(task) => {
                setSelectedTaskForChat(task);
                setShowChat(true);
              }}
              unreadCount={0} // TODO: Implement unread counts
            />
          ))}
        </Box>
      )}

      {/* Quick Task Creator */}
      <QuickTaskCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onTaskCreated={loadData}
        teamMembers={teamMembers}
      />

      {/* Task Chat Dialog */}
      <TaskChatDialog
        open={showChat}
        onClose={() => {
          setShowChat(false);
          setSelectedTaskForChat(null);
        }}
        task={selectedTaskForChat}
        teamMembers={teamMembers}
      />

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => setShowCreator(true)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

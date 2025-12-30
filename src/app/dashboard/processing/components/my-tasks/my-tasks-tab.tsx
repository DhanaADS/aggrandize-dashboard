'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import {
  ProcessingOrderItem,
  ProcessingTaskFilters,
  PROCESSING_STATUS_COLORS,
  PROCESSING_STATUS_LABELS
} from '@/types/processing';
import { TaskDetailDrawer } from './task-detail-drawer';
import {
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Link,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

export function MyTasksTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProcessingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProcessingOrderItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const [filters, setFilters] = useState<ProcessingTaskFilters>({
    assigned_to: user?.name || user?.email?.split('@')[0] || '',
    search: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.processing_status) params.append('status', filters.processing_status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      if (filters.overdue_only) params.append('overdue_only', 'true');

      const response = await fetch(`/api/processing?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (task: ProcessingOrderItem) => {
    setSelectedTask(task);
    setShowDetailDrawer(true);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    setShowDetailDrawer(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate) return false;
    if (['approved', 'published', 'completed'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusChip = (status: string, approvalFeedback: string | null) => {
    const color = PROCESSING_STATUS_COLORS[status as keyof typeof PROCESSING_STATUS_COLORS] || '#64748b';
    const label = PROCESSING_STATUS_LABELS[status as keyof typeof PROCESSING_STATUS_LABELS] || status;

    // Show rejection indicator if there's feedback
    if (status === 'content_writing' && approvalFeedback) {
      return (
        <Tooltip title="Rejected - See feedback">
          <Chip
            label="Needs Revision"
            size="small"
            sx={{
              bgcolor: '#ef4444' + '20',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
            icon={<WarningIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
          />
        </Tooltip>
      );
    }

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: color + '20',
          color: color,
          fontWeight: 600,
          fontSize: '0.75rem'
        }}
      />
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            My Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </Box>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Website, keyword, client..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.processing_status || ''}
                  onChange={(e) => setFilters({ ...filters, processing_status: e.target.value as any })}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="content_writing">Content Writing</MenuItem>
                  <MenuItem value="pending_approval">Pending Approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="publishing">Publishing</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Show</InputLabel>
                <Select
                  value={filters.overdue_only ? 'overdue' : 'all'}
                  onChange={(e) => setFilters({ ...filters, overdue_only: e.target.value === 'overdue' })}
                  label="Show"
                >
                  <MenuItem value="all">All Tasks</MenuItem>
                  <MenuItem value="overdue">Overdue Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="text"
                onClick={() => setFilters({ assigned_to: filters.assigned_to, search: '' })}
                sx={{ mt: 0.5 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have any assigned tasks matching the current filters.
          </Typography>
        </Paper>
      )}

      {/* Tasks Table */}
      {!loading && !error && tasks.length > 0 && (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Publication</TableCell>
                <TableCell>Client URL</TableCell>
                <TableCell>Article</TableCell>
                <TableCell>Live</TableCell>
                <TableCell align="right">Processing Payment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => {
                const overdue = isOverdue(task.assignment?.due_date || null, task.processing_status);
                return (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: overdue ? 'rgba(239, 68, 68, 0.05)' : 'inherit',
                      '&:hover': {
                        bgcolor: overdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)'
                      }
                    }}
                    onClick={() => handleRowClick(task)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" color="primary">
                        {task.order?.order_number || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {task.order?.client_name || '-'}
                      </Typography>
                      {task.order?.project_name && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {task.order.project_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {task.keyword}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {task.website}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {task.client_url ? (
                        <Link
                          href={task.client_url.startsWith('http') ? task.client_url : `https://${task.client_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {task.client_url.replace(/^https?:\/\//, '').slice(0, 20)}...
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {task.content_url ? (
                        <Link
                          href={task.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          View <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {task.live_url ? (
                        <Link
                          href={task.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          View <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Processing Payment (what we pay to publisher)">
                        <Typography variant="body2" fontWeight="600" color="success.main">
                          {formatCurrency(task.processing_payment || task.inventory_price)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(task.processing_status, task.approval_feedback)}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {overdue && (
                          <Tooltip title="Overdue">
                            <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          </Tooltip>
                        )}
                        <Typography
                          variant="body2"
                          color={overdue ? 'error.main' : 'text.primary'}
                          fontWeight={overdue ? 600 : 400}
                        >
                          {formatDate(task.assignment?.due_date || null)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={0.5} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(task);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          open={showDetailDrawer}
          onClose={() => setShowDetailDrawer(false)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </Box>
  );
}

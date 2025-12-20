'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { ProcessingOrderItem, ProcessingTaskFilters } from '@/types/processing';
import { TaskCard } from './task-card';
import { TaskDetailModal } from '../task-detail/task-detail-modal';
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
  IconButton,
  Button
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

export function MyTasksTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProcessingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProcessingOrderItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (task: ProcessingOrderItem) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = (task: ProcessingOrderItem) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    setShowDetailModal(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            My Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All tasks assigned to you
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

      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Website or keyword..."
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
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
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
          </Grid>
        </Paper>
      </Collapse>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

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

      {!loading && !error && tasks.length > 0 && (
        <Grid container spacing={3}>
          {tasks.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <TaskCard
                task={task}
                onViewDetails={handleViewDetails}
                onUpdateStatus={handleUpdateStatus}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </Box>
  );
}

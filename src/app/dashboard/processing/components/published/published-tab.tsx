'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { ProcessingOrderItem } from '@/types/processing';
import { TaskCard } from '../my-tasks/task-card';
import { TaskDetailModal } from '../task-detail/task-detail-modal';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';

export function PublishedTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProcessingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProcessingOrderItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        assigned_to: user?.name || user?.email?.split('@')[0] || '',
        status: 'published'
      });

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
      <Box mb={3}>
        <Typography variant="h5" fontWeight="600" gutterBottom>
          Published Items
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Items that are live and awaiting payment
        </Typography>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {!loading && !error && tasks.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No published items
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have any published items yet.
          </Typography>
        </Paper>
      )}

      {!loading && !error && tasks.length > 0 && (
        <>
          <Alert severity="success" sx={{ mb: 3 }}>
            You have {tasks.length} published item{tasks.length > 1 ? 's' : ''}.
            You can now request payment for these items.
          </Alert>
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
        </>
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

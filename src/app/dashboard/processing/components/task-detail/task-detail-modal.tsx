'use client';

import { useState } from 'react';
import { ProcessingOrderItem, ProcessingStatus, PROCESSING_STATUS_LABELS } from '@/types/processing';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Stack,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Link as LinkIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import {
  PROCESSING_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS
} from '@/types/processing';

interface TaskDetailModalProps {
  task: ProcessingOrderItem;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailModal({ task, open, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [status, setStatus] = useState<ProcessingStatus>(task.processing_status);
  const [contentUrl, setContentUrl] = useState(task.live_url || '');
  const [liveUrl, setLiveUrl] = useState(task.live_url || '');
  const [notes, setNotes] = useState(task.notes || '');

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/processing/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processing_status: status,
          notes: notes || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      setSuccess('Status updated successfully');
      setTimeout(() => {
        onTaskUpdated();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!contentUrl.trim()) {
      setError('Please provide a content URL');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/processing/${task.id}/submit-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_url: contentUrl,
          notes: notes || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to submit for approval');

      setSuccess('Submitted for approval successfully');
      setTimeout(() => {
        onTaskUpdated();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for approval');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitLiveUrl = async () => {
    if (!liveUrl.trim()) {
      setError('Please provide a live URL');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/processing/${task.id}/submit-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_url: liveUrl,
          live_date: new Date().toISOString().split('T')[0],
          notes: notes || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to submit live URL');

      setSuccess('Live URL submitted successfully');
      setTimeout(() => {
        onTaskUpdated();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit live URL');
    } finally {
      setUpdating(false);
    }
  };

  const canSubmitForApproval = ['in_progress', 'content_writing'].includes(task.processing_status);
  const canSubmitLiveUrl = task.processing_status === 'approved';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="600">
            Task Details
          </Typography>
          <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Keyword
          </Typography>
          <Typography variant="h6" gutterBottom>
            {task.keyword}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Website
          </Typography>
          <Typography variant="body1" gutterBottom>
            {task.website}
          </Typography>

          {task.order && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Order
              </Typography>
              <Typography variant="body2" gutterBottom>
                {task.order.order_number} - {task.order.client_name}
                {task.order.project_name && ` (${task.order.project_name})`}
              </Typography>
            </>
          )}

          <Box display="flex" gap={1} mt={2}>
            <Chip
              label={PROCESSING_STATUS_LABELS[task.processing_status]}
              sx={{
                backgroundColor: PROCESSING_STATUS_COLORS[task.processing_status] + '20',
                color: PROCESSING_STATUS_COLORS[task.processing_status],
                fontWeight: 600,
                border: `1px solid ${PROCESSING_STATUS_COLORS[task.processing_status]}40`
              }}
            />
            {task.assignment?.priority && (
              <Chip
                label={TASK_PRIORITY_LABELS[task.assignment.priority]}
                sx={{
                  backgroundColor: TASK_PRIORITY_COLORS[task.assignment.priority] + '20',
                  color: TASK_PRIORITY_COLORS[task.assignment.priority],
                  fontWeight: 600,
                  border: `1px solid ${TASK_PRIORITY_COLORS[task.assignment.priority]}40`
                }}
              />
            )}
          </Box>

          {task.assignment?.due_date && (
            <Typography variant="body2" color="text.secondary" mt={2}>
              Due Date: {new Date(task.assignment.due_date).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProcessingStatus)}
              label="Status"
            >
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="content_writing">Content Writing</MenuItem>
              <MenuItem value="pending_approval">Pending Approval</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="publishing">Publishing</MenuItem>
              <MenuItem value="published">Published</MenuItem>
            </Select>
          </FormControl>

          {canSubmitForApproval && (
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                Submit for Approval
              </Typography>
              <TextField
                fullWidth
                label="Content URL"
                placeholder="https://..."
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={handleSubmitForApproval}
                disabled={updating || !contentUrl.trim()}
                fullWidth
              >
                Submit for Approval
              </Button>
            </Box>
          )}

          {canSubmitLiveUrl && (
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                Submit Live URL
              </Typography>
              <TextField
                fullWidth
                label="Live URL"
                placeholder="https://..."
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                variant="outlined"
                color="success"
                startIcon={<LinkIcon />}
                onClick={handleSubmitLiveUrl}
                disabled={updating || !liveUrl.trim()}
                fullWidth
              >
                Submit Live URL
              </Button>
            </Box>
          )}

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or comments..."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleUpdateStatus}
          disabled={updating}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

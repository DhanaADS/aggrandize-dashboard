'use client';

import { useState } from 'react';
import {
  ProcessingOrderItem,
  PROCESSING_STATUS_COLORS,
  PROCESSING_STATUS_LABELS
} from '@/types/processing';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Link,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Article as ArticleIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface TaskDetailDrawerProps {
  task: ProcessingOrderItem;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailDrawer({ task, open, onClose, onTaskUpdated }: TaskDetailDrawerProps) {
  const [articleLink, setArticleLink] = useState(task.content_url || '');
  const [liveUrl, setLiveUrl] = useState(task.live_url || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const isOverdue = () => {
    const dueDate = task.assignment?.due_date;
    if (!dueDate) return false;
    if (['approved', 'published', 'completed'].includes(task.processing_status)) return false;
    return new Date(dueDate) < new Date();
  };

  // Check if task was rejected (has feedback and status is content_writing)
  const wasRejected = task.processing_status === 'content_writing' && task.approval_feedback;

  // Determine which action is available based on status
  const canSubmitForApproval = ['not_started', 'in_progress', 'content_writing'].includes(task.processing_status);
  const canSubmitLiveUrl = task.processing_status === 'approved';
  const isPendingApproval = task.processing_status === 'pending_approval';
  const isPublished = ['published', 'completed'].includes(task.processing_status);

  const handleSubmitForApproval = async () => {
    if (!articleLink.trim()) {
      setError('Please enter the article link (Google Drive URL)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/processing/${task.id}/submit-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_url: articleLink,
          notes: notes
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit for approval');

      setSuccess('Article submitted for approval successfully!');
      setTimeout(() => {
        onTaskUpdated();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for approval');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLiveUrl = async () => {
    if (!liveUrl.trim()) {
      setError('Please enter the live URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/processing/${task.id}/submit-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_url: liveUrl,
          notes: notes
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit live URL');

      setSuccess('Live URL submitted successfully!');
      setTimeout(() => {
        onTaskUpdated();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit live URL');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = PROCESSING_STATUS_COLORS[task.processing_status as keyof typeof PROCESSING_STATUS_COLORS] || '#64748b';
  const statusLabel = PROCESSING_STATUS_LABELS[task.processing_status as keyof typeof PROCESSING_STATUS_LABELS] || task.processing_status;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 } }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="600">
            Task Details
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {/* Order Info Section */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Order
                </Typography>
                <Typography variant="h6" fontWeight="600" color="primary">
                  {task.order?.order_number || '-'}
                </Typography>
              </Box>
              <Chip
                label={wasRejected ? 'Needs Revision' : statusLabel}
                size="small"
                sx={{
                  bgcolor: wasRejected ? '#ef4444' + '20' : statusColor + '20',
                  color: wasRejected ? '#ef4444' : statusColor,
                  fontWeight: 600
                }}
                icon={wasRejected ? <WarningIcon sx={{ fontSize: 14 }} /> : undefined}
              />
            </Box>

            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Client</Typography>
                <Typography variant="body2" fontWeight="500">{task.order?.client_name || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  color={isOverdue() ? 'error.main' : 'text.primary'}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  {isOverdue() && <WarningIcon sx={{ fontSize: 14 }} />}
                  {formatDate(task.assignment?.due_date || null)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Publication Info */}
          <Typography variant="subtitle2" fontWeight="600" gutterBottom>
            Publication Details
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
              <Typography variant="body2" color="text.secondary">Publication</Typography>
              <Typography variant="body2" fontWeight="500">{task.website}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
              <Typography variant="body2" color="text.secondary">Keyword</Typography>
              <Typography variant="body2" fontWeight="500">{task.keyword}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
              <Typography variant="body2" color="text.secondary">Client URL</Typography>
              {task.client_url ? (
                <Link
                  href={task.client_url.startsWith('http') ? task.client_url : `https://${task.client_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  View <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              ) : (
                <Typography variant="body2">-</Typography>
              )}
            </Box>
            <Box display="flex" justifyContent="space-between" py={1}>
              <Typography variant="body2" color="text.secondary">Price</Typography>
              <Typography variant="body2" fontWeight="600" color="success.main">
                {formatCurrency(task.inventory_price)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Rejection Feedback (if rejected) */}
          {wasRejected && (
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              sx={{ mb: 3 }}
            >
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Revision Required
              </Typography>
              <Typography variant="body2">
                {task.approval_feedback}
              </Typography>
            </Alert>
          )}

          {/* Success/Error Messages */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Action Sections based on status */}

          {/* Submit for Approval Section */}
          {canSubmitForApproval && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArticleIcon sx={{ fontSize: 18 }} />
                {wasRejected ? 'Resubmit Article' : 'Submit Article for Approval'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {wasRejected
                  ? 'Update your article based on the feedback and resubmit for approval.'
                  : 'Enter the Google Drive link to your article draft for marketing team review.'
                }
              </Typography>
              <TextField
                fullWidth
                label="Article Link (Google Drive)"
                placeholder="https://docs.google.com/document/..."
                value={articleLink}
                onChange={(e) => setArticleLink(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                placeholder="Any notes for the reviewer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSubmitForApproval}
                disabled={loading || !articleLink.trim()}
              >
                {wasRejected ? 'Resubmit for Approval' : 'Submit for Approval'}
              </Button>
            </Box>
          )}

          {/* Pending Approval Status */}
          {isPendingApproval && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(245, 158, 11, 0.1)' }}>
              <ScheduleIcon sx={{ fontSize: 48, color: '#f59e0b', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your article has been submitted and is awaiting review by the marketing team.
              </Typography>
              {task.content_url && (
                <Box mt={2}>
                  <Link
                    href={task.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    View Submitted Article <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                </Box>
              )}
            </Paper>
          )}

          {/* Submit Live URL Section (after approval) */}
          {canSubmitLiveUrl && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="600">
                  Article Approved!
                </Typography>
                <Typography variant="body2">
                  Your article has been approved. Please publish it and enter the live URL below.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublicIcon sx={{ fontSize: 18 }} />
                Submit Live URL
              </Typography>
              <TextField
                fullWidth
                label="Live URL"
                placeholder="https://example.com/article-url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                color="success"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                onClick={handleSubmitLiveUrl}
                disabled={loading || !liveUrl.trim()}
              >
                Submit Live URL
              </Button>
            </Box>
          )}

          {/* Published Status */}
          {isPublished && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                Published
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This article has been published successfully.
              </Typography>
              {task.live_url && (
                <Link
                  href={task.live_url.startsWith('http') ? task.live_url : `https://${task.live_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  View Live Article <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              )}
              {task.live_date && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Published on {formatDate(task.live_date)}
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

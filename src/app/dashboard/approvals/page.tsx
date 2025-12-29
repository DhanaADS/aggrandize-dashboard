'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Article as ArticleIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface PendingApprovalItem {
  id: string;
  order_id: string;
  website: string;
  keyword: string;
  client_url: string;
  content_url: string | null;
  content_notes: string | null;
  processing_status: string;
  approval_requested_at: string | null;
  order_number: string;
  client_name: string;
  project_name: string | null;
  assigned_to: string | null;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Dialog state
  const [reviewItem, setReviewItem] = useState<PendingApprovalItem | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/approvals');
      if (!response.ok) throw new Error('Failed to fetch pending approvals');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (item: PendingApprovalItem) => {
    setReviewItem(item);
    setShowReviewDialog(true);
    setShowRejectForm(false);
    setRejectionReason('');
  };

  const handleCloseReview = () => {
    setShowReviewDialog(false);
    setReviewItem(null);
    setShowRejectForm(false);
    setRejectionReason('');
  };

  const handleApprove = async () => {
    if (!reviewItem) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/order/${reviewItem.order_id}/items/${reviewItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (!response.ok) throw new Error('Failed to approve');

      handleCloseReview();
      fetchPendingApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewItem || !rejectionReason.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/order/${reviewItem.order_id}/items/${reviewItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to reject');

      handleCloseReview();
      fetchPendingApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="700" gutterBottom>
          Approval Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve article submissions from the processing team
        </Typography>
      </Box>

      {/* Stats */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(245, 158, 11, 0.1)' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <ArticleIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
          <Box>
            <Typography variant="h3" fontWeight="700" color="#f59e0b">
              {items.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Approval{items.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ApproveIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pending Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All article submissions have been reviewed. Great job!
          </Typography>
        </Paper>
      )}

      {/* Pending Items Table */}
      {!loading && !error && items.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Publication</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Submitted By</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>Article</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" color="primary">
                      {item.order_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {item.client_name}
                    </Typography>
                    {item.project_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {item.project_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.website}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">{item.keyword}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.assigned_to?.split('@')[0] || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(item.approval_requested_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.content_url ? (
                      <Link
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        View <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenReview(item)}
                      sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Review Dialog */}
      <Dialog
        open={showReviewDialog}
        onClose={handleCloseReview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="600">Review Article</Typography>
          <IconButton onClick={handleCloseReview}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {reviewItem && (
            <Box>
              {/* Item Details */}
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
                  <Typography variant="body2" color="text.secondary">Order</Typography>
                  <Typography variant="body2" fontWeight="600" color="primary">{reviewItem.order_number}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
                  <Typography variant="body2" color="text.secondary">Client</Typography>
                  <Typography variant="body2" fontWeight="500">{reviewItem.client_name}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
                  <Typography variant="body2" color="text.secondary">Publication</Typography>
                  <Typography variant="body2">{reviewItem.website}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1} borderBottom={1} borderColor="divider">
                  <Typography variant="body2" color="text.secondary">Keyword</Typography>
                  <Typography variant="body2" fontWeight="500">{reviewItem.keyword}</Typography>
                </Box>
              </Box>

              {/* Article Link */}
              {reviewItem.content_url && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                    Article to Review
                  </Typography>
                  <Link
                    href={reviewItem.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <ArticleIcon sx={{ fontSize: 20 }} />
                    Open Article in New Tab
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                  {reviewItem.content_notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notes: {reviewItem.content_notes}
                    </Typography>
                  )}
                </Paper>
              )}

              {/* Rejection Form */}
              {showRejectForm && (
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom color="error">
                    Rejection Feedback
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Please provide feedback so the processing team can revise the article.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Enter your feedback for revision..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {!showRejectForm ? (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => setShowRejectForm(true)}
                disabled={submitting}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <ApproveIcon />}
                onClick={handleApprove}
                disabled={submitting}
              >
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => setShowRejectForm(false)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <RejectIcon />}
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
              >
                Send Rejection Feedback
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

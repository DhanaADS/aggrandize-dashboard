'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import { CheckCircle as ApproveIcon, Cancel as RejectIcon } from '@mui/icons-material';

interface ContentApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  itemDetails: {
    website: string;
    keyword: string;
    live_url?: string;
  };
}

export function ContentApprovalDialog({
  open,
  onClose,
  onApprove,
  onReject,
  itemDetails,
}: ContentApprovalDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      await onApprove();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve content');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onReject(rejectionReason);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject content');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRejectionReason('');
      setShowRejectForm(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Content Approval</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          <Typography variant="body2" fontWeight="600">
            {itemDetails.website}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Keyword: {itemDetails.keyword}
          </Typography>
          {itemDetails.live_url && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <a href={itemDetails.live_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                View Live Content →
              </a>
            </Typography>
          )}
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!showRejectForm ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Review the content and approve or reject the submission.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<ApproveIcon />}
                onClick={handleApprove}
                disabled={loading}
                sx={{ minWidth: 150 }}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<RejectIcon />}
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                sx={{ minWidth: 150 }}
              >
                Reject
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="error.main" sx={{ mb: 2, fontWeight: 600 }}>
              Please provide a reason for rejection:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Explain what needs to be improved or corrected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
              autoFocus
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {showRejectForm ? (
          <>
            <Button onClick={() => setShowRejectForm(false)} disabled={loading}>
              Back
            </Button>
            <Button variant="contained" color="error" onClick={handleReject} disabled={loading || !rejectionReason.trim()}>
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

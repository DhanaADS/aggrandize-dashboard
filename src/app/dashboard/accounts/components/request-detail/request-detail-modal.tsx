'use client';

import { useState } from 'react';
import { ProcessingPaymentRequest } from '@/types/processing';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Divider,
  Alert,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Paid as PaidIcon
} from '@mui/icons-material';

interface RequestDetailModalProps {
  request: ProcessingPaymentRequest & {
    order_item?: {
      website: string;
      keyword: string;
      order?: {
        order_number: string;
        client_name: string;
      };
    };
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function RequestDetailModal({ request, onClose, onUpdate }: RequestDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  const handleApprove = async () => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/accounts/${request.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          review_notes: reviewNotes || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve request');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/accounts/${request.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          review_notes: reviewNotes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentReference.trim()) {
      setError('Please provide a payment reference');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/accounts/${request.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_reference: paymentReference,
          payment_proof_url: paymentProofUrl || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as paid');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="600">
            Payment Request Details
          </Typography>
          <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Chip
              label={request.status.replace('_', ' ').toUpperCase()}
              color={
                request.status === 'paid' ? 'success' :
                request.status === 'approved' ? 'info' :
                request.status === 'rejected' ? 'error' : 'warning'
              }
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Amount
            </Typography>
            <Typography variant="h5" fontWeight="600" color="primary">
              ${request.amount.toFixed(2)} USD
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Payment Method
            </Typography>
            <Typography variant="body1">
              {request.payment_method.replace('_', ' ').toUpperCase()}
            </Typography>
          </Box>

          {request.order_item && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Website
                </Typography>
                <Typography variant="body1">{request.order_item.website}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Keyword
                </Typography>
                <Typography variant="body1">{request.order_item.keyword}</Typography>
              </Box>

              {request.order_item.order && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Order
                  </Typography>
                  <Typography variant="body1">
                    {request.order_item.order.order_number} - {request.order_item.order.client_name}
                  </Typography>
                </Box>
              )}
            </>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Requested By
            </Typography>
            <Typography variant="body1">{request.requested_by}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Requested On
            </Typography>
            <Typography variant="body1">
              {new Date(request.requested_at).toLocaleString()}
            </Typography>
          </Box>

          {request.recipient_account_details && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Account Details
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                {request.recipient_account_details}
              </Typography>
            </Box>
          )}

          {request.notes && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Notes
              </Typography>
              <Typography variant="body2">{request.notes}</Typography>
            </Box>
          )}

          {request.review_notes && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Review Notes
              </Typography>
              <Typography variant="body2">{request.review_notes}</Typography>
            </Box>
          )}

          {request.payment_reference && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Payment Reference
              </Typography>
              <Typography variant="body2" fontFamily="monospace">{request.payment_reference}</Typography>
            </Box>
          )}

          <Divider />

          {request.status === 'pending' && (
            <>
              <TextField
                fullWidth
                label="Review Notes"
                multiline
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your review decision..."
              />
            </>
          )}

          {request.status === 'approved' && (
            <>
              <TextField
                fullWidth
                required
                label="Payment Reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or reference number"
              />
              <TextField
                fullWidth
                label="Payment Proof URL (optional)"
                value={paymentProofUrl}
                onChange={(e) => setPaymentProofUrl(e.target.value)}
                placeholder="https://..."
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>

        {request.status === 'pending' && (
          <>
            <Button
              variant="contained"
              color="error"
              startIcon={<RejectIcon />}
              onClick={handleReject}
              disabled={updating}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleApprove}
              disabled={updating}
            >
              Approve
            </Button>
          </>
        )}

        {request.status === 'approved' && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PaidIcon />}
            onClick={handleMarkAsPaid}
            disabled={updating || !paymentReference.trim()}
          >
            Mark as Paid
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

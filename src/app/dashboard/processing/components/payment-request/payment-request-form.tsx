'use client';

import { useState } from 'react';
import { CreatePaymentRequestInput, PROCESSING_PAYMENT_METHODS, PROCESSING_PAYMENT_METHOD_LABELS } from '@/types/processing';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Typography,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';

interface PaymentRequestFormProps {
  orderItemId: string;
  website: string;
  keyword: string;
  userName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentRequestForm({
  orderItemId,
  website,
  keyword,
  userName,
  open,
  onClose,
  onSuccess
}: PaymentRequestFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreatePaymentRequestInput>({
    order_item_id: orderItemId,
    amount: 0,
    currency: 'USD',
    payment_method: 'wise',
    requested_by: userName,
    recipient_name: '',
    recipient_email: '',
    recipient_account_details: '',
    notes: ''
  });

  const handleSubmit = async () => {
    if (formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.payment_method) {
      setError('Please select a payment method');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/processing/${orderItemId}/request-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit payment request');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="600">
            Request Payment
          </Typography>
          <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Task
          </Typography>
          <Typography variant="body1" gutterBottom>
            {keyword}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {website}
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            required
            fullWidth
            label="Amount"
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            helperText="Enter amount in USD"
          />

          <FormControl fullWidth required>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              label="Payment Method"
            >
              {PROCESSING_PAYMENT_METHODS.map((method) => (
                <MenuItem key={method} value={method}>
                  {PROCESSING_PAYMENT_METHOD_LABELS[method]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Recipient Name"
            value={formData.recipient_name}
            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
            placeholder="Your full name"
          />

          <TextField
            fullWidth
            label="Recipient Email"
            type="email"
            value={formData.recipient_email}
            onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
            placeholder="your.email@example.com"
          />

          <TextField
            fullWidth
            label="Account Details"
            multiline
            rows={3}
            value={formData.recipient_account_details}
            onChange={(e) => setFormData({ ...formData, recipient_account_details: e.target.value })}
            placeholder="Bank account, PayPal email, or Wise details..."
            helperText="Provide the account details where you want to receive payment"
          />

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes (optional)..."
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleSubmit}
          disabled={submitting || formData.amount <= 0}
        >
          Submit Request
        </Button>
      </DialogActions>
    </Dialog>
  );
}

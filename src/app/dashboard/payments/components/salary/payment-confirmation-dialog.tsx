'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { CheckCircle, AccountBalance } from '@mui/icons-material';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  employeeName: string;
  salaryAmount: number;
  isLoading: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export function PaymentConfirmationDialog({
  open,
  onClose,
  onConfirm,
  employeeName,
  salaryAmount,
  isLoading
}: PaymentConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalance color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Confirm Bank Transfer
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert
          severity="info"
          sx={{ mb: 2, mt: 1 }}
          icon={false}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {employeeName}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5, color: '#10b981', fontWeight: 700 }}>
            {formatCurrency(salaryAmount)}
          </Typography>
        </Alert>

        <Typography variant="body1" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
          Are you sure you want to confirm the bank transfer for{' '}
          <strong style={{ color: 'inherit' }}>{employeeName}</strong>?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
          sx={{ minWidth: 160 }}
        >
          {isLoading ? 'Processing...' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

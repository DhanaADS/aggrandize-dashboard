'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Expense, ExpenseFormData, ADS_ACCOUNTS } from '@/types/finance';
import { createExpense, updateExpense } from '@/lib/finance-api';

// Category options
const CATEGORIES = ['Tea/Snacks', 'Office', 'Transport', 'Other'];

// Team members
const TEAM_MEMBERS = ['Dhanapal', 'Veera', 'Saravana', 'Saran', 'Abbas', 'Gokul', 'Shang', 'Laura'];

// Payment methods
const PAYMENT_METHODS = ['Cash', 'Office Card', 'Sevan Card', 'Bank Transfer'];

// Status options
const STATUS_OPTIONS = ['pending', 'paid', 'approved', 'rejected'];

interface ExpenseFormDialogProps {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

const USD_TO_INR_RATE = 83.5;

export function ExpenseFormDialog({ open, expense, onClose, onSuccess }: ExpenseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - person_paid is always ADS_Accounts (company account)
  const [formData, setFormData] = useState({
    amount_inr: '',
    amount_usd: '',
    category_id: '',
    person_responsible: '',
    payment_method_id: 'Cash',
    payment_status: 'pending',
    expense_date: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: '',
  });

  // Reset form when dialog opens/closes or expense changes
  useEffect(() => {
    if (open) {
      if (expense) {
        // Edit mode - populate form with existing data
        setFormData({
          amount_inr: expense.amount_inr?.toString() || '',
          amount_usd: expense.amount_usd?.toString() || '',
          category_id: expense.category_id || '',
          person_responsible: expense.person_responsible || '',
          payment_method_id: expense.payment_method_id || 'Cash',
          payment_status: expense.payment_status || 'pending',
          expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
          purpose: expense.purpose || '',
          notes: expense.notes || '',
        });
      } else {
        // Add mode - reset to defaults
        setFormData({
          amount_inr: '',
          amount_usd: '',
          category_id: '',
          person_responsible: '',
          payment_method_id: 'Cash',
          payment_status: 'pending',
          expense_date: new Date().toISOString().split('T')[0],
          purpose: '',
          notes: '',
        });
      }
      setError(null);
    }
  }, [open, expense]);

  // Auto-calculate USD when INR changes
  const handleAmountINRChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      amount_inr: value,
      amount_usd: value ? (parseFloat(value) / USD_TO_INR_RATE).toFixed(2) : '',
    }));
  };

  // Auto-calculate INR when USD changes
  const handleAmountUSDChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      amount_usd: value,
      amount_inr: value ? Math.round(parseFloat(value) * USD_TO_INR_RATE).toString() : '',
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.amount_inr || parseFloat(formData.amount_inr) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.category_id) {
      setError('Please select a category');
      return;
    }
    if (!formData.person_responsible) {
      setError('Please select who is responsible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const expenseData: ExpenseFormData = {
        amount_inr: parseFloat(formData.amount_inr),
        amount_usd: parseFloat(formData.amount_usd) || parseFloat(formData.amount_inr) / USD_TO_INR_RATE,
        category_id: formData.category_id,
        person_paid: ADS_ACCOUNTS, // Always set to company account
        person_responsible: formData.person_responsible,
        payment_method_id: formData.payment_method_id,
        payment_status: formData.payment_status as 'pending' | 'paid' | 'approved' | 'rejected',
        expense_date: formData.expense_date,
        purpose: formData.purpose,
        notes: formData.notes,
      };

      if (expense) {
        await updateExpense(expense.id, expenseData);
      } else {
        await createExpense(expenseData);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="600">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Amount INR */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount (INR)"
              type="number"
              required
              value={formData.amount_inr}
              onChange={(e) => handleAmountINRChange(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>,
              }}
            />
          </Grid>

          {/* Amount USD */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount (USD)"
              type="number"
              value={formData.amount_usd}
              onChange={(e) => handleAmountUSDChange(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>,
              }}
              helperText="Auto-calculated at ₹83.5/USD"
            />
          </Grid>

          {/* Category */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Person Responsible - who is this expense for */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Expense For (Team Member)</InputLabel>
              <Select
                label="Expense For (Team Member)"
                value={formData.person_responsible}
                onChange={(e) => setFormData({ ...formData, person_responsible: e.target.value })}
              >
                {TEAM_MEMBERS.map((member) => (
                  <MenuItem key={member} value={member}>
                    {member}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                label="Payment Method"
                value={formData.payment_method_id}
                onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Purpose */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Team lunch, Office supplies"
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {expense ? 'Update' : 'Add Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

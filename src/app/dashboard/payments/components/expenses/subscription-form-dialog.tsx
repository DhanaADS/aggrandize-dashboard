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
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Subscription, SubscriptionFormData } from '@/types/finance';
import { createSubscription, updateSubscription } from '@/lib/finance-api';

// Category options
const CATEGORIES = ['Software', 'Cloud Services', 'Marketing', 'Tools', 'Other'];

// Renewal cycle options
const RENEWAL_CYCLES = ['Monthly', 'Quarterly', 'Yearly'];

// Team members
const TEAM_MEMBERS = ['Dhanapal', 'Veera', 'Saravana', 'Saran', 'Abbas', 'Gokul', 'Shang', 'Laura'];

// Payment methods
const PAYMENT_METHODS = ['Cash', 'Office Card', 'Sevan Card', 'Bank Transfer'];

interface SubscriptionFormDialogProps {
  open: boolean;
  subscription: Subscription | null;
  onClose: () => void;
  onSuccess: () => void;
}

const USD_TO_INR_RATE = 83.5;

export function SubscriptionFormDialog({ open, subscription, onClose, onSuccess }: SubscriptionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    platform: '',
    plan_type: '',
    purpose: '',
    amount_inr: '',
    amount_usd: '',
    category: '',
    renewal_cycle: 'Monthly' as 'Monthly' | 'Quarterly' | 'Yearly',
    due_date: new Date().toISOString().split('T')[0],
    next_due_date: '',
    auto_renewal: true,
    is_active: true,
    billing_type: 'postpaid' as 'prepaid' | 'postpaid',
    payment_method_id: 'Office Card',
    used_by: '',
    paid_by: '',
    notes: '',
  });

  // Reset form when dialog opens/closes or subscription changes
  useEffect(() => {
    if (open) {
      if (subscription) {
        // Edit mode - populate form with existing data
        setFormData({
          platform: subscription.platform || '',
          plan_type: subscription.plan_type || '',
          purpose: subscription.purpose || '',
          amount_inr: subscription.amount_inr?.toString() || '',
          amount_usd: subscription.amount_usd?.toString() || '',
          category: subscription.category || '',
          renewal_cycle: subscription.renewal_cycle || 'Monthly',
          due_date: subscription.due_date || new Date().toISOString().split('T')[0],
          next_due_date: subscription.next_due_date || '',
          auto_renewal: subscription.auto_renewal ?? true,
          is_active: subscription.is_active ?? true,
          billing_type: subscription.billing_type || 'postpaid',
          payment_method_id: subscription.payment_method_id || 'Office Card',
          used_by: subscription.used_by || '',
          paid_by: subscription.paid_by || '',
          notes: subscription.notes || '',
        });
      } else {
        // Add mode - reset to defaults
        setFormData({
          platform: '',
          plan_type: '',
          purpose: '',
          amount_inr: '',
          amount_usd: '',
          category: '',
          renewal_cycle: 'Monthly',
          due_date: new Date().toISOString().split('T')[0],
          next_due_date: '',
          auto_renewal: true,
          is_active: true,
          billing_type: 'postpaid',
          payment_method_id: 'Office Card',
          used_by: '',
          paid_by: '',
          notes: '',
        });
      }
      setError(null);
    }
  }, [open, subscription]);

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

  // Calculate next due date based on renewal cycle
  const calculateNextDueDate = (dueDate: string, cycle: string) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    switch (cycle) {
      case 'Monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'Quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'Yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  // Update next_due_date when due_date or renewal_cycle changes
  useEffect(() => {
    if (formData.due_date) {
      setFormData((prev) => ({
        ...prev,
        next_due_date: calculateNextDueDate(prev.due_date, prev.renewal_cycle),
      }));
    }
  }, [formData.due_date, formData.renewal_cycle]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.platform.trim()) {
      setError('Please enter a platform name');
      return;
    }
    if (!formData.amount_inr || parseFloat(formData.amount_inr) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.category) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const subscriptionData: SubscriptionFormData = {
        platform: formData.platform,
        plan_type: formData.plan_type,
        purpose: formData.purpose,
        amount_inr: parseFloat(formData.amount_inr),
        amount_usd: parseFloat(formData.amount_usd) || parseFloat(formData.amount_inr) / USD_TO_INR_RATE,
        category: formData.category,
        renewal_cycle: formData.renewal_cycle,
        due_date: formData.due_date,
        next_due_date: formData.next_due_date || calculateNextDueDate(formData.due_date, formData.renewal_cycle),
        auto_renewal: formData.auto_renewal,
        is_active: formData.is_active,
        billing_type: formData.billing_type,
        payment_method_id: formData.payment_method_id,
        used_by: formData.used_by,
        paid_by: formData.paid_by,
        notes: formData.notes,
      };

      if (subscription) {
        await updateSubscription(subscription.id, subscriptionData);
      } else {
        await createSubscription(subscriptionData);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError('Failed to save subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="600">
            {subscription ? 'Edit Subscription' : 'Add Subscription'}
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
          {/* Platform */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Platform"
              required
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              placeholder="e.g., Netflix, AWS, GitHub"
            />
          </Grid>

          {/* Plan Type */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Plan Type"
              value={formData.plan_type}
              onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
              placeholder="e.g., Premium, Business, Pro"
            />
          </Grid>

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
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Renewal Cycle */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Renewal Cycle</InputLabel>
              <Select
                label="Renewal Cycle"
                value={formData.renewal_cycle}
                onChange={(e) => setFormData({ ...formData, renewal_cycle: e.target.value as 'Monthly' | 'Quarterly' | 'Yearly' })}
              >
                {RENEWAL_CYCLES.map((cycle) => (
                  <MenuItem key={cycle} value={cycle}>
                    {cycle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Billing Type */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Billing Type
              </Typography>
              <ToggleButtonGroup
                value={formData.billing_type}
                exclusive
                onChange={(_e, value) => {
                  if (value) setFormData({ ...formData, billing_type: value });
                }}
                fullWidth
                size="small"
              >
                <ToggleButton
                  value="prepaid"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: '#10b98130',
                      color: '#10b981',
                      '&:hover': { bgcolor: '#10b98140' },
                    },
                  }}
                >
                  Prepaid
                </ToggleButton>
                <ToggleButton
                  value="postpaid"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: '#f59e0b30',
                      color: '#f59e0b',
                      '&:hover': { bgcolor: '#f59e0b40' },
                    },
                  }}
                >
                  Postpaid
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {formData.billing_type === 'prepaid' ? 'Paid in advance (no overdue risk)' : 'Paid after service (can be overdue)'}
              </Typography>
            </Box>
          </Grid>

          {/* Due Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Next Due Date (auto-calculated) */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Next Due Date"
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Auto-calculated based on cycle"
            />
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

          {/* Used By */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Used By</InputLabel>
              <Select
                label="Used By"
                value={formData.used_by}
                onChange={(e) => setFormData({ ...formData, used_by: e.target.value })}
              >
                <MenuItem value="">Team/Company</MenuItem>
                {TEAM_MEMBERS.map((member) => (
                  <MenuItem key={member} value={member}>
                    {member}
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
              placeholder="e.g., Video editing software, Cloud hosting"
            />
          </Grid>

          {/* Toggles Row */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.auto_renewal}
                  onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                />
              }
              label="Auto Renewal"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
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
          {subscription ? 'Update' : 'Add Subscription'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Fade,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';
import { createExpense } from '@/lib/finance-api';
import { ExpenseFormData } from '@/types/finance';

// Quick category presets
const QUICK_CATEGORIES = [
  { key: 'tea', icon: '☕', label: 'Tea/Snacks' },
  { key: 'office', icon: '🧹', label: 'Office' },
  { key: 'transport', icon: '🚗', label: 'Transport' },
  { key: 'other', icon: '📦', label: 'Other' },
];

// Amount presets in INR
const AMOUNT_PRESETS = [50, 100, 200, 500];

interface QuickExpenseWidgetProps {
  currentUser?: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

const USD_TO_INR_RATE = 83.5;

export function QuickExpenseWidget({ currentUser = '', onSuccess, defaultExpanded = true }: QuickExpenseWidgetProps) {
  // Expand/Collapse state
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [purpose, setPurpose] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle category selection
  const handleCategorySelect = (key: string) => {
    setSelectedCategory(key);
    const cat = QUICK_CATEGORIES.find((c) => c.key === key);
    if (cat && !purpose) {
      setPurpose(cat.label);
    }
  };

  // Handle amount selection
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustomAmount(false);
    setCustomAmount('');
  };

  // Handle custom amount
  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setIsCustomAmount(true);
    setSelectedAmount(value ? parseFloat(value) : null);
  };

  // Get final amount
  const getFinalAmount = (): number => {
    if (isCustomAmount && customAmount) {
      return parseFloat(customAmount);
    }
    return selectedAmount || 0;
  };

  // Validate form
  const isFormValid = (): boolean => {
    return !!(selectedCategory && getFinalAmount() > 0);
  };

  // Reset form
  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedAmount(null);
    setCustomAmount('');
    setIsCustomAmount(false);
    setPurpose('');
    setError(null);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Please select a category and amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const amount = getFinalAmount();
      const categoryLabel = QUICK_CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'Other';

      const expenseData: ExpenseFormData = {
        amount_inr: amount,
        amount_usd: Number((amount / USD_TO_INR_RATE).toFixed(2)),
        category_id: categoryLabel,
        person_paid: currentUser || 'Unknown',
        person_responsible: currentUser || 'Unknown',
        purpose: purpose || categoryLabel,
        payment_method_id: 'Cash',
        payment_status: 'pending',
        expense_date: new Date().toISOString().split('T')[0],
        notes: 'Added via Quick Entry',
      };

      await createExpense(expenseData);

      // Show success animation
      setShowSuccess(true);

      // Reset form after delay
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error('Error creating expense:', err);
      setError('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Success Overlay */}
      <Fade in={showSuccess}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(16, 185, 129, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <SuccessIcon sx={{ fontSize: 64, color: 'white', mb: 2 }} />
          <Typography variant="h5" fontWeight="700" color="white">
            Expense Added!
          </Typography>
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            ₹{getFinalAmount().toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Fade>

      {/* Header - Clickable to expand/collapse */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          p: 3,
          borderBottom: isExpanded ? 1 : 0,
          borderColor: 'divider',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ⚡ Quick Expense
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isExpanded ? 'Add a new expense in seconds' : 'Click to add expense'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
      <Box sx={{ p: 3 }}>
        {/* Error message */}
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Category Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>
            Category
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {QUICK_CATEGORIES.map((cat) => (
              <Box
                key={cat.key}
                onClick={() => handleCategorySelect(cat.key)}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: selectedCategory === cat.key ? 'primary.main' : 'divider',
                  bgcolor: selectedCategory === cat.key ? 'primary.main' + '15' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.main' + '10',
                  },
                }}
              >
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  {cat.icon}
                </Typography>
                <Typography variant="caption" fontWeight={selectedCategory === cat.key ? 600 : 400}>
                  {cat.label.split('/')[0]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Amount Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>
            Amount
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            {AMOUNT_PRESETS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount && !isCustomAmount ? 'contained' : 'outlined'}
                color="success"
                size="small"
                onClick={() => handleAmountSelect(amount)}
                sx={{
                  flex: 1,
                  fontWeight: 600,
                }}
              >
                ₹{amount}
              </Button>
            ))}
          </Box>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            onFocus={() => setIsCustomAmount(true)}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: isCustomAmount && customAmount ? 'success.main' + '15' : 'transparent',
              },
            }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>,
            }}
          />
        </Box>

        {/* Purpose (Optional) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>
            Purpose (optional)
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g., Team tea, Office cleaning"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </Box>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
          sx={{
            py: 1.5,
            fontWeight: 600,
            fontSize: '1rem',
          }}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting
            ? 'Adding...'
            : `Add Expense${getFinalAmount() > 0 ? ` (₹${getFinalAmount().toLocaleString('en-IN')})` : ''}`}
        </Button>

        {/* User Info */}
        {currentUser && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Logging as: <strong>{currentUser}</strong>
          </Typography>
        )}
      </Box>
      </Collapse>
    </Paper>
  );
}

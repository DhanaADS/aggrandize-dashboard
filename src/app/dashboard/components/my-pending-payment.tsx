'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  AccountBalance as PaymentIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { getExpenses } from '@/lib/finance-api';
import { Expense } from '@/types/finance';

interface MyPendingPaymentProps {
  userName: string;
}

export function MyPendingPayment({ userName }: MyPendingPaymentProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchPendingExpenses = useCallback(async () => {
    if (!userName) return;

    setLoading(true);
    try {
      // Fetch expenses where user paid and status is pending
      const data = await getExpenses({
        person_paid: userName,
        status: 'pending',
      });
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    fetchPendingExpenses();
  }, [fetchPendingExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, exp) => sum + (Number(exp.amount_inr) || 0), 0);

  // If no pending expenses, don't show the card
  if (!loading && expenses.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="text" width="60%" height={48} />
        <Skeleton variant="text" width="30%" height={24} />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 0,
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: '#f59e0b40',
        bgcolor: 'rgba(245, 158, 11, 0.05)',
      }}
    >
      {/* Header - Always Visible */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 3,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.08)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: '#f59e0b20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PaymentIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Pending Settlement
            </Typography>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#f59e0b' }}>
              {formatCurrency(totalAmount)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              bgcolor: '#f59e0b20',
              color: '#f59e0b',
              fontWeight: 600,
            }}
          />
          <IconButton size="small">
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box sx={{ px: 3, pb: 3, pt: 0 }}>
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary' }}>
              Pending Expenses
            </Typography>
            {expenses.slice(0, 5).map((expense, index) => (
              <Box
                key={expense.id || index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: index < Math.min(expenses.length, 5) - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {expense.category_id || 'Expense'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {expense.purpose || expense.description || 'No description'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#f59e0b' }}>
                    {formatCurrency(Number(expense.amount_inr) || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(expense.expense_date || '')}
                  </Typography>
                </Box>
              </Box>
            ))}
            {expenses.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                +{expenses.length - 5} more expenses
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}

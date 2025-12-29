'use client';

import { useState, useEffect, useCallback } from 'react';
import { Subscription, Expense, SubscriptionFilters, ExpenseFilters } from '@/types/finance';
import { getSubscriptions, getExpenses } from '@/lib/finance-api';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Collapse,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

// Unified expense item type
interface UnifiedExpenseItem {
  id: string;
  type: 'subscription' | 'expense';
  date: string;
  description: string;
  platform?: string;
  purpose?: string;
  amount_inr: number;
  amount_usd: number;
  status: string;
  paid_by: string;
  renewal_cycle?: string;
  category?: string;
  payment_status?: string;
  raw: Subscription | Expense;
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  paid: '#10b981',
  approved: '#3b82f6',
  pending: '#f59e0b',
  rejected: '#ef4444',
  inactive: '#64748b',
};

export function FinancialExpensesSimple() {
  const [items, setItems] = useState<UnifiedExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '' as '' | 'subscription' | 'expense',
    status: '',
    search: '',
    date_from: '',
    date_to: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch both subscriptions and expenses in parallel
      const [subscriptionsData, expensesData] = await Promise.all([
        getSubscriptions({ search: filters.search || undefined } as SubscriptionFilters),
        getExpenses({
          search: filters.search || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          payment_status: filters.status || undefined,
        } as ExpenseFilters),
      ]);

      // Transform subscriptions to unified format
      const subscriptionItems: UnifiedExpenseItem[] = (subscriptionsData || []).map((sub) => ({
        id: sub.id,
        type: 'subscription' as const,
        date: sub.next_due_date || sub.due_date,
        description: sub.platform,
        platform: sub.platform,
        purpose: sub.purpose,
        amount_inr: sub.amount_inr,
        amount_usd: sub.amount_usd,
        status: sub.is_active ? 'active' : 'inactive',
        paid_by: sub.paid_by || '-',
        renewal_cycle: sub.renewal_cycle,
        category: sub.category,
        raw: sub,
      }));

      // Transform expenses to unified format
      const expenseItems: UnifiedExpenseItem[] = (expensesData || []).map((exp) => ({
        id: exp.id,
        type: 'expense' as const,
        date: exp.expense_date,
        description: exp.purpose,
        purpose: exp.purpose,
        amount_inr: exp.amount_inr,
        amount_usd: exp.amount_usd || 0,
        status: exp.payment_status,
        paid_by: exp.person_paid,
        category: exp.category?.name,
        payment_status: exp.payment_status,
        raw: exp,
      }));

      // Combine and filter by type if specified
      let combined = [...subscriptionItems, ...expenseItems];

      if (filters.type) {
        combined = combined.filter(item => item.type === filters.type);
      }

      if (filters.status) {
        combined = combined.filter(item => item.status === filters.status);
      }

      // Sort by date (most recent first)
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setItems(combined);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const delayedLoad = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(delayedLoad);
  }, [loadData]);

  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusChip = (status: string) => {
    const color = STATUS_COLORS[status] || '#64748b';
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: `${color}20`,
          color: color,
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  };

  const getTypeChip = (type: 'subscription' | 'expense') => {
    const isSubscription = type === 'subscription';
    return (
      <Chip
        label={isSubscription ? 'Subscription' : 'Expense'}
        size="small"
        sx={{
          bgcolor: isSubscription ? '#8b5cf620' : '#06b6d420',
          color: isSubscription ? '#8b5cf6' : '#06b6d4',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      search: '',
      date_from: '',
      date_to: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Expenses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {items.length} item{items.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={hasActiveFilters ? 'primary' : 'inherit'}
          >
            Filters {hasActiveFilters && `(${Object.values(filters).filter(Boolean).length})`}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            Add Expense
          </Button>
        </Box>
      </Box>

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="600">
              Filter Expenses
            </Typography>
            {hasActiveFilters && (
              <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Platform, purpose..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  label="Type"
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as '' | 'subscription' | 'expense' })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="subscription">Subscriptions</MenuItem>
                  <MenuItem value="expense">Expenses</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Amount (₹)</TableCell>
              <TableCell align="right">Amount ($)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Paid By</TableCell>
              <TableCell>Cycle</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from(new Array(5)).map((_, index) => (
                <TableRow key={index}>
                  {Array.from(new Array(10)).map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No expenses found
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    {hasActiveFilters
                      ? 'Try adjusting your filters'
                      : 'Add your first expense or subscription to get started'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={`${item.type}-${item.id}`} hover>
                  <TableCell>
                    <Typography variant="body2">{formatDate(item.date)}</Typography>
                  </TableCell>
                  <TableCell>{getTypeChip(item.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">
                      {item.platform || item.description}
                    </Typography>
                    {item.purpose && item.platform && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {item.purpose}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.category || '-'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600" color="success.main">
                      {formatCurrency(item.amount_inr, 'INR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(item.amount_usd, 'USD')}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.paid_by}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.renewal_cycle || '-'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

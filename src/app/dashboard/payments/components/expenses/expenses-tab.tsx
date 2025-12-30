'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Skeleton,
  Alert,
  Collapse,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  CheckCircle as SettleIcon,
  Receipt as ExpenseIcon,
  AccountBalance as SettlementIcon,
  Repeat as SubscriptionsIcon,
} from '@mui/icons-material';
import { Expense, ExpenseFilters } from '@/types/finance';
import { getExpenses, deleteExpense, updateExpense } from '@/lib/finance-api';
import { ExpenseFormDialog } from './expense-form-dialog';
import { UserSettlements } from './user-settlements';
import { SubscriptionsSubTab } from './subscriptions-sub-tab';

type ExpenseSubTab = 'expenses' | 'settlements' | 'subscriptions';

// Status colors following design system
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#10b981',
  approved: '#3b82f6',
  rejected: '#ef4444',
};

// Category options
const CATEGORIES = ['Tea/Snacks', 'Office', 'Transport', 'Other'];

// Team members
const TEAM_MEMBERS = ['Dhanapal', 'Veera', 'Saravana', 'Saran', 'Abbas', 'Gokul', 'Shang'];

export function ExpensesTab() {
  const { data: session } = useSession();
  const [activeSubTab, setActiveSubTab] = useState<ExpenseSubTab>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses(filters);
      setExpenses(data || []);
    } catch (err) {
      setError('Failed to load expenses');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refreshTrigger]);

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteExpense(expenseId);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert('Failed to delete expense');
      console.error('Error deleting expense:', err);
    }
  };

  const handleSettle = async (expenseId: string) => {
    if (!confirm('Mark this expense as settled/paid?')) return;

    try {
      await updateExpense(expenseId, { payment_status: 'paid' });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert('Failed to settle expense');
      console.error('Error settling expense:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExpense(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);
  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  // Calculate totals
  const totalINR = expenses.reduce((sum, e) => sum + (e.amount_inr || 0), 0);
  const pendingCount = expenses.filter((e) => e.payment_status === 'pending').length;

  return (
    <Box>
      {/* Sub-Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeSubTab}
          onChange={(_, newValue) => setActiveSubTab(newValue)}
          aria-label="Expense sub-tabs"
        >
          <Tab
            value="expenses"
            icon={<ExpenseIcon />}
            label="Current Month"
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            value="settlements"
            icon={<SettlementIcon />}
            label="Settlements"
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            value="subscriptions"
            icon={<SubscriptionsIcon />}
            label="Subscriptions"
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* Settlements Sub-Tab */}
      {activeSubTab === 'settlements' && (
        <UserSettlements refreshTrigger={refreshTrigger} adminName={session?.user?.name || 'Admin'} />
      )}

      {/* Subscriptions Sub-Tab */}
      {activeSubTab === 'subscriptions' && (
        <SubscriptionsSubTab />
      )}

      {/* Expenses Sub-Tab */}
      {activeSubTab === 'expenses' && (
        <>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight="600">
                Expenses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
                {pendingCount > 0 && ` • ${pendingCount} pending`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                color={hasActiveFilters ? 'primary' : 'inherit'}
              >
                Filters {hasActiveFilters && `(${activeFilterCount})`}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingExpense(null);
                  setShowForm(true);
                }}
              >
                Add Expense
              </Button>
            </Box>
          </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
          <Typography variant="h5" fontWeight="700" sx={{ color: 'primary.main' }}>{formatCurrency(totalINR)}</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">Pending</Typography>
          <Typography variant="h5" fontWeight="700" sx={{ color: '#f59e0b' }}>{pendingCount}</Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="600">Filter Expenses</Typography>
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
                placeholder="Purpose, notes..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={filters.category_id || ''}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Paid By</InputLabel>
                <Select
                  label="Paid By"
                  value={filters.person_paid || ''}
                  onChange={(e) => setFilters({ ...filters, person_paid: e.target.value })}
                >
                  <MenuItem value="">All Members</MenuItem>
                  {TEAM_MEMBERS.map((member) => (
                    <MenuItem key={member} value={member}>{member}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filters.payment_status || ''}
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value as 'pending' | 'paid' | 'approved' | 'rejected' | undefined })}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Data Table */}
      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : expenses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No expenses found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first expense to get started'}
          </Typography>
          {!hasActiveFilters && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
              Add First Expense
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell align="right">Amount (INR)</TableCell>
                <TableCell align="right">Amount (USD)</TableCell>
                <TableCell>Paid By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>
                    <Typography variant="body2">{formatDate(expense.expense_date)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.category_id || 'Other'}
                      size="small"
                      sx={{ bgcolor: 'primary.main' + '20', color: 'primary.main', fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {expense.purpose || '-'}
                    </Typography>
                    {expense.notes && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {expense.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600">
                      {formatCurrency(expense.amount_inr || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      ${expense.amount_usd?.toFixed(2) || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{expense.person_paid || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.payment_status || 'pending'}
                      size="small"
                      sx={{
                        bgcolor: `${STATUS_COLORS[expense.payment_status || 'pending']}20`,
                        color: STATUS_COLORS[expense.payment_status || 'pending'],
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowForm(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Delete"
                        onClick={() => handleDelete(expense.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {expense.payment_status === 'pending' && (
                        <IconButton
                          size="small"
                          title="Mark as Settled"
                          onClick={() => handleSettle(expense.id)}
                          sx={{ color: 'success.main' }}
                        >
                          <SettleIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Expense Form Dialog */}
      <ExpenseFormDialog
        open={showForm}
        expense={editingExpense}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
        onSuccess={handleFormSuccess}
      />
        </>
      )}
    </Box>
  );
}

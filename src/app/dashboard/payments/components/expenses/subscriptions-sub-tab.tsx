'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Repeat as SubscriptionIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Subscription, SubscriptionFilters } from '@/types/finance';
import { getSubscriptions, deleteSubscription } from '@/lib/finance-api';
import { SubscriptionFormDialog } from './subscription-form-dialog';

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  'AI': '🤖',
  'Website': '🌐',
  'Network': '📡',
  'Social': '📱',
  'Forum': '💬',
  'Media tool': '🎨',
  'Software': '💻',
  'Cloud Services': '☁️',
  'Marketing': '📈',
  'Tools': '🔧',
  'Other': '📦',
};

// Renewal cycle colors
const CYCLE_COLORS: Record<string, string> = {
  'Monthly': '#3b82f6',
  'Quarterly': '#f59e0b',
  'Yearly': '#10b981',
};

// Status colors following design system
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  inactive: '#6b7280',
  overdue: '#ef4444',
  dueSoon: '#f59e0b',
};

// Renewal cycle options
const RENEWAL_CYCLES = ['Monthly', 'Quarterly', 'Yearly'];

// Category options (from imported data)
const CATEGORIES = ['AI', 'Website', 'Network', 'Social', 'Forum', 'Media tool', 'Software', 'Cloud Services', 'Marketing', 'Tools', 'Other'];

// Stat Card Component (matching Salary tab)
const StatCard = ({ title, value, subValue, color }: { title: string; value: React.ReactNode; subValue?: string; color?: string }) => (
  <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Typography variant="body2" color="text.secondary">{title}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="h5" fontWeight="600" sx={{ color: color || 'text.primary' }}>{value}</Typography>
      {subValue && <Typography variant="caption" color="text.secondary">{subValue}</Typography>}
    </Box>
  </Paper>
);

export function SubscriptionsSubTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SubscriptionFilters>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscriptions(filters);
      setSubscriptions(data || []);
    } catch (err) {
      setError('Failed to load subscriptions');
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions, refreshTrigger]);

  // Helper functions
  const isOverdue = (sub: Subscription) => {
    if (!sub.is_active) return false;
    const dueDate = new Date(sub.next_due_date || sub.due_date);
    return dueDate < new Date();
  };

  const isDueSoon = (sub: Subscription) => {
    if (!sub.is_active) return false;
    const dueDate = new Date(sub.next_due_date || sub.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  };

  const getDueDateStatus = (sub: Subscription) => {
    if (isOverdue(sub)) return 'overdue';
    if (isDueSoon(sub)) return 'dueSoon';
    return 'normal';
  };

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      await deleteSubscription(subscriptionId);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert('Failed to delete subscription');
      console.error('Error deleting subscription:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSubscription(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
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

  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS['Other'];
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');
  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter((s) => s.is_active);
  const activeCount = activeSubscriptions.length;
  const overdueCount = subscriptions.filter(isOverdue).length;
  const dueSoonCount = subscriptions.filter(isDueSoon).length;

  // Sort subscriptions: Overdue first, then Due Soon, then rest
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    const aDueSoon = isDueSoon(a);
    const bDueSoon = isDueSoon(b);

    // Overdue items first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then due soon items
    if (aDueSoon && !bDueSoon) return -1;
    if (!aDueSoon && bDueSoon) return 1;

    // Then by due date (earliest first)
    const aDate = new Date(a.next_due_date || a.due_date).getTime();
    const bDate = new Date(b.next_due_date || b.due_date).getTime();
    return aDate - bDate;
  });

  const totalMonthlyINR = activeSubscriptions.reduce((sum, s) => {
    const amount = Number(s.amount_inr) || 0;
    if (s.renewal_cycle === 'Monthly') return sum + amount;
    if (s.renewal_cycle === 'Quarterly') return sum + amount / 3;
    if (s.renewal_cycle === 'Yearly') return sum + amount / 12;
    return sum;
  }, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Subscriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all your software and service subscriptions
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
              setEditingSubscription(null);
              setShowForm(true);
            }}
          >
            Add Subscription
          </Button>
        </Box>
      </Box>

      {/* Summary Cards - Matching Salary Tab Style */}
      {loading ? (
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, mb: 4 }} />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Active Subscriptions"
              value={activeCount}
              subValue={`of ${subscriptions.length} total`}
              color="#10b981"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Monthly Spend"
              value={formatCurrency(Math.round(totalMonthlyINR))}
              subValue="estimated"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Due This Week"
              value={dueSoonCount}
              subValue={dueSoonCount > 0 ? 'needs attention' : 'all clear'}
              color={dueSoonCount > 0 ? '#f59e0b' : undefined}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Overdue"
              value={overdueCount}
              subValue={overdueCount > 0 ? 'requires action' : 'none'}
              color={overdueCount > 0 ? '#ef4444' : '#10b981'}
            />
          </Grid>
        </Grid>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overdue Alert Banner */}
      {overdueCount > 0 && !loading && (
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight="600">
            {overdueCount} subscription{overdueCount > 1 ? 's are' : ' is'} overdue!
          </Typography>
        </Alert>
      )}

      {/* Due Soon Alert Banner */}
      {dueSoonCount > 0 && overdueCount === 0 && !loading && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight="600">
            {dueSoonCount} subscription{dueSoonCount > 1 ? 's' : ''} due within 7 days
          </Typography>
        </Alert>
      )}

      {/* Filters Panel */}
      <Collapse in={showFilters}>
        <Paper elevation={1} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="600">Filter Subscriptions</Typography>
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
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {getCategoryIcon(cat)} {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Renewal Cycle</InputLabel>
                <Select
                  label="Renewal Cycle"
                  value={filters.renewal_cycle || ''}
                  onChange={(e) => setFilters({ ...filters, renewal_cycle: e.target.value })}
                >
                  <MenuItem value="">All Cycles</MenuItem>
                  {RENEWAL_CYCLES.map((cycle) => (
                    <MenuItem key={cycle} value={cycle}>{cycle}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.is_active === true}
                    onChange={(e) => setFilters({ ...filters, is_active: e.target.checked ? true : undefined })}
                  />
                }
                label="Active Only"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.due_soon === true}
                    onChange={(e) => setFilters({ ...filters, due_soon: e.target.checked ? true : undefined })}
                  />
                }
                label="Due Soon"
              />
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Data Table */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : subscriptions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SubscriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No subscriptions found
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
              {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first subscription to get started'}
            </Typography>
            {!hasActiveFilters && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
                Add First Subscription
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.focus' }}>
                <TableRow>
                  <TableCell>Platform</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Cycle</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedSubscriptions.map((subscription) => {
                  const dueDateStatus = getDueDateStatus(subscription);
                  const isOverdueItem = dueDateStatus === 'overdue';
                  const isDueSoonItem = dueDateStatus === 'dueSoon';

                  return (
                    <TableRow
                      key={subscription.id}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: isOverdueItem
                          ? 'rgba(239, 68, 68, 0.08)'
                          : isDueSoonItem
                          ? 'rgba(245, 158, 11, 0.05)'
                          : 'inherit',
                        // Subtle pulse animation for urgent items
                        ...(isOverdueItem && {
                          animation: 'urgentPulse 2s ease-in-out infinite',
                          '@keyframes urgentPulse': {
                            '0%, 100%': { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
                            '50%': { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                          },
                        }),
                        ...(isDueSoonItem && !isOverdueItem && {
                          animation: 'warningPulse 3s ease-in-out infinite',
                          '@keyframes warningPulse': {
                            '0%, 100%': { backgroundColor: 'rgba(245, 158, 11, 0.05)' },
                            '50%': { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
                          },
                        }),
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontSize: '1.2rem' }}>
                            {getCategoryIcon(subscription.category)}
                          </Typography>
                          <Box>
                            <Typography variant="body2" fontWeight="600">{subscription.platform}</Typography>
                            {subscription.purpose && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {subscription.purpose}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{subscription.plan_type || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.category || 'Other'}
                          size="small"
                          sx={{ bgcolor: 'primary.main' + '20', color: 'primary.main', fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="600" sx={{ color: '#00ff88' }}>
                          {formatCurrency(subscription.amount_inr || 0)}
                        </Typography>
                        {Number(subscription.amount_usd) > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ${Number(subscription.amount_usd).toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.renewal_cycle}
                          size="small"
                          sx={{
                            bgcolor: `${CYCLE_COLORS[subscription.renewal_cycle] || '#6b7280'}20`,
                            color: CYCLE_COLORS[subscription.renewal_cycle] || '#6b7280',
                            fontWeight: 600,
                            border: `1px solid ${CYCLE_COLORS[subscription.renewal_cycle] || '#6b7280'}40`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: isOverdueItem
                                ? STATUS_COLORS.overdue
                                : isDueSoonItem
                                ? STATUS_COLORS.dueSoon
                                : 'text.primary',
                              fontWeight: isOverdueItem || isDueSoonItem ? 600 : 400,
                            }}
                          >
                            {formatDate(subscription.next_due_date || subscription.due_date)}
                          </Typography>
                          {isOverdueItem && (
                            <Chip
                              label="OVERDUE"
                              size="small"
                              sx={{
                                bgcolor: STATUS_COLORS.overdue,
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                height: 20,
                              }}
                            />
                          )}
                          {isDueSoonItem && !isOverdueItem && (
                            <Chip
                              label="DUE SOON"
                              size="small"
                              sx={{
                                bgcolor: STATUS_COLORS.dueSoon,
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: subscription.is_active ? '#10b98120' : '#6b728020',
                            color: subscription.is_active ? '#10b981' : '#6b7280',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            title="Edit"
                            onClick={() => {
                              setEditingSubscription(subscription);
                              setShowForm(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Delete"
                            onClick={() => handleDelete(subscription.id)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Subscription Form Dialog */}
      <SubscriptionFormDialog
        open={showForm}
        subscription={editingSubscription}
        onClose={() => {
          setShowForm(false);
          setEditingSubscription(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </Box>
  );
}

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
  Skeleton,
  Alert,
  Collapse,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  CloudUpload as ImportIcon,
  TrendingUp as CurrentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  Order,
  OrderFilters,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  OrderStatus,
  PaymentStatus,
} from '@/types/orders';
import { OrderForm } from './order-form';
import { ImportOrdersDialog } from '../import/import-orders-dialog';
import { PreviousYearsTab } from './previous-years-tab';

// Sub-tab type for Orders section
type OrdersSubTab = 'current' | 'previous';

// Admin emails who can see all orders
const ADMIN_EMAILS = [
  'dhana@aggrandizedigital.com',
  'saravana@aggrandizedigital.com',
];

interface OrdersTabProps {
  onViewOrder: (orderId: string) => void;
}

export function OrdersTab({ onViewOrder }: OrdersTabProps) {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<OrdersSubTab>('current'); // Sub-tab state

  // Check if current user is admin
  const userEmail = session?.user?.email || '';
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.client_name) params.append('client', filters.client_name);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search);

      // Always filter to 2026 orders only (current year tab)
      if (!filters.date_from) {
        params.append('date_from', '2026-01-01');
      }

      // Non-admins can only see orders assigned to them
      if (!isAdmin && userEmail) {
        params.append('assigned_to', userEmail);
      }

      const url = `/api/order${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.error || 'Failed to load orders');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin, userEmail]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) return;

    try {
      const response = await fetch(`/api/order/${orderId}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to delete order');
      }
    } catch (err) {
      alert('Failed to delete order');
      console.error('Error deleting order:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingOrder(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  if (showForm) {
    return (
      <OrderForm
        order={editingOrder}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setEditingOrder(null);
        }}
      />
    );
  }

  return (
    <Box>
      {/* Sub-Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeSubTab}
          onChange={(_, newValue) => setActiveSubTab(newValue)}
          aria-label="Order sub-tabs"
        >
          <Tab
            value="current"
            icon={<CurrentIcon />}
            label="2026 Orders"
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            value="previous"
            icon={<HistoryIcon />}
            label="Previous Years"
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* Previous Years Tab Content */}
      {activeSubTab === 'previous' && (
        <PreviousYearsTab onViewOrder={onViewOrder} />
      )}

      {/* Current Year (2026) Tab Content */}
      {activeSubTab === 'current' && (
        <>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight="600">
                2026 Orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
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
              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<ImportIcon />}
                  onClick={() => setShowImportDialog(true)}
                >
                  Import
                </Button>
              )}
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
                New Order
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
              Filter Orders
            </Typography>
            {hasActiveFilters && (
              <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Order #, client, project..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as OrderStatus || undefined })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment</InputLabel>
                <Select
                  value={filters.payment_status || ''}
                  label="Payment"
                  onChange={(e) =>
                    setFilters({ ...filters, payment_status: e.target.value as PaymentStatus || undefined })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button size="small" onClick={fetchOrders} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No orders found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first order to get started'}
          </Typography>
          {!hasActiveFilters && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
              Create First Order
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Items</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  hover
                  onClick={() => onViewOrder(order.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.main' }}>
                      {order.order_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {order.client_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.project_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(order.order_date)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ORDER_STATUS_LABELS[order.status]}
                      size="small"
                      sx={{
                        bgcolor: `${ORDER_STATUS_COLORS[order.status]}20`,
                        color: ORDER_STATUS_COLORS[order.status],
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {order.items_completed || 0}/{order.items_count || 0}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
        </>
      )}

      {/* Import Dialog */}
      <ImportOrdersDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </Box>
  );
}

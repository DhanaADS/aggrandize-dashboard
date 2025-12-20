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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Order,
  OrderFilters,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  OrderStatus,
  PaymentStatus,
} from '@/types/orders';
import { OrderForm } from './order-form';

interface OrdersTabProps {
  onViewOrder: (orderId: string) => void;
}

export function OrdersTab({ onViewOrder }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [filters]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Orders
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.main' }}>
                      {order.order_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {order.client_name}
                    </Typography>
                    {order.client_company && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {order.client_company}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.project_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(order.order_date)}</Typography>
                    {order.due_date && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Due: {formatDate(order.due_date)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600">
                      {formatCurrency(order.total_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{
                        color:
                          order.balance_due > 0
                            ? 'warning.main'
                            : order.balance_due === 0
                            ? 'success.main'
                            : 'text.primary',
                      }}
                    >
                      {formatCurrency(order.balance_due)}
                    </Typography>
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
                  <TableCell>
                    <Chip
                      label={PAYMENT_STATUS_LABELS[order.payment_status]}
                      size="small"
                      sx={{
                        bgcolor: `${PAYMENT_STATUS_COLORS[order.payment_status]}20`,
                        color: PAYMENT_STATUS_COLORS[order.payment_status],
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
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => onViewOrder(order.id)}
                        title="View Details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingOrder(order);
                          setShowForm(true);
                        }}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(order.id, order.order_number)}
                        title="Delete"
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

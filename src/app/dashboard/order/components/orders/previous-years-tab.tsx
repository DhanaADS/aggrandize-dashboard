'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
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
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  History as HistoryIcon,
  Person as ClientIcon,
  Business as CompanyIcon,
  Visibility as ViewIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Order,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/types/orders';

interface PreviousYearsTabProps {
  onViewOrder: (orderId: string) => void;
}

// Available years for filtering (will be dynamically populated)
const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export function PreviousYearsTab({ onViewOrder }: PreviousYearsTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [orderCount, setOrderCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch orders for the selected year only
      const dateFrom = `${selectedYear}-01-01`;
      const dateTo = `${selectedYear}-12-31`;

      const params = new URLSearchParams();
      params.append('date_from', dateFrom);
      params.append('date_to', dateTo);

      const url = `/api/order?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        setOrderCount(data.orders?.length || 0);
      } else {
        setError(data.error || 'Failed to load orders');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      {/* Header with Year Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon /> Previous Year Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historical reference data - View client information for returning customers
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(e.target.value as number)}
          >
            {AVAILABLE_YEARS.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Info Banner */}
      <Alert
        severity="info"
        icon={<InfoIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2">
          <strong>Reference Only:</strong> These orders are from {selectedYear} and are not included in the Overview statistics.
          Use this data to view client history and contact information for returning customers.
        </Typography>
      </Alert>

      {/* Stats Summary Card */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Year</Typography>
              <Typography variant="h6" fontWeight="600">{selectedYear}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Orders</Typography>
              <Typography variant="h6" fontWeight="600">{orderCount}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Unique Clients</Typography>
              <Typography variant="h6" fontWeight="600">
                {new Set(orders.map(o => o.client_email || o.client_name)).size}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

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
          <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No orders found for {selectedYear}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try selecting a different year
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Client Info</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600" color="text.secondary">
                      {order.order_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ClientIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight="500">
                          {order.client_name}
                        </Typography>
                      </Box>
                      {order.client_company && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CompanyIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {order.client_company}
                          </Typography>
                        </Box>
                      )}
                      {order.client_email && (
                        <Typography variant="caption" color="text.disabled">
                          {order.client_email}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {order.project_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(order.order_date)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600">
                      {formatCurrency(order.total_amount)}
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
                  <TableCell align="center">
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => onViewOrder(order.id)}
                      color="inherit"
                    >
                      View
                    </Button>
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

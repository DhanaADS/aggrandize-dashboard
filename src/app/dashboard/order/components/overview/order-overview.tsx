'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
} from '@mui/material';
import {
  ShoppingCart as OrderIcon,
  TrendingUp as RevenueIcon,
  Payment as PaidIcon,
  AccountBalance as OutstandingIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Order,
  OrderStats,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/types/orders';

interface OrderOverviewProps {
  onViewOrder: (orderId: string) => void;
}

export function OrderOverview({ onViewOrder }: OrderOverviewProps) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Filter to 2026 orders only (fresh start for new year)
      const response = await fetch('/api/order?date_from=2026-01-01');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        // Get last 5 orders sorted by date
        const sorted = [...(data.orders || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentOrders(sorted.slice(0, 5));
      } else {
        setError(data.error || 'Failed to load data');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching order data:', err);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const statCards = [
    {
      label: 'Total Orders',
      value: stats?.total_orders || 0,
      icon: <OrderIcon sx={{ fontSize: 40 }} />,
      color: '#3b82f6',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: <RevenueIcon sx={{ fontSize: 40 }} />,
      color: '#10b981',
    },
    {
      label: 'Amount Paid',
      value: formatCurrency(stats?.total_paid || 0),
      icon: <PaidIcon sx={{ fontSize: 40 }} />,
      color: '#8b5cf6',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(stats?.total_outstanding || 0),
      icon: <OutstandingIcon sx={{ fontSize: 40 }} />,
      color: '#f59e0b',
    },
  ];

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}05)`,
                border: `1px solid ${stat.color}30`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="700" sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.8 }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Status Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                Orders by Status
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {[
                  { label: 'Draft', count: stats?.draft_count || 0, color: ORDER_STATUS_COLORS.draft },
                  { label: 'Confirmed', count: stats?.confirmed_count || 0, color: ORDER_STATUS_COLORS.confirmed },
                  { label: 'In Progress', count: stats?.in_progress_count || 0, color: ORDER_STATUS_COLORS.in_progress },
                  { label: 'Completed', count: stats?.completed_count || 0, color: ORDER_STATUS_COLORS.completed },
                  { label: 'Cancelled', count: stats?.cancelled_count || 0, color: ORDER_STATUS_COLORS.cancelled },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: `${item.color}15`,
                      border: `1px solid ${item.color}30`,
                      minWidth: 120,
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: item.color,
                      }}
                    />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h6" fontWeight="600">
                        {item.count}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                Revenue Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h6" fontWeight="600" color="success.main">
                    {formatCurrency(stats?.total_revenue || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="text.secondary">Collected</Typography>
                  <Typography variant="h6" fontWeight="600" color="primary.main">
                    {formatCurrency(stats?.total_paid || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="text.secondary">Outstanding</Typography>
                  <Typography variant="h6" fontWeight="600" color="warning.main">
                    {formatCurrency(stats?.total_outstanding || 0)}
                  </Typography>
                </Box>
                {stats && stats.total_revenue > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Collection Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          flex: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.800',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${(stats.total_paid / stats.total_revenue) * 100}%`,
                            height: '100%',
                            bgcolor: 'success.main',
                            borderRadius: 4,
                          }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight="600">
                        {Math.round((stats.total_paid / stats.total_revenue) * 100)}%
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              Recent Orders
            </Typography>
          </Box>

          {recentOrders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <OrderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">No orders yet</Typography>
              <Typography variant="body2" color="text.disabled">
                Create your first order to get started
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {order.order_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{order.client_name}</Typography>
                        {order.client_company && (
                          <Typography variant="caption" color="text.secondary">
                            {order.client_company}
                          </Typography>
                        )}
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
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => onViewOrder(order.id)}
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
        </CardContent>
      </Card>
    </Box>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import {
  ProcessingOrderItem,
  ProcessingStats,
  PROCESSING_STATUS_COLORS,
  PROCESSING_STATUS_LABELS
} from '@/types/processing';
import {
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Link,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface AllTasksFilters {
  status?: string;
  assigned_to?: string;
  search?: string;
}

export function AllTasksTab() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProcessingOrderItem[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<AllTasksFilters>({
    search: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('view', 'all');  // Request all tasks view
      if (filters.status) params.append('status', filters.status);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/processing?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isOverdue = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate) return false;
    if (['approved', 'published', 'completed'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusChip = (status: string, approvalFeedback: string | null) => {
    const color = PROCESSING_STATUS_COLORS[status as keyof typeof PROCESSING_STATUS_COLORS] || '#64748b';
    const label = PROCESSING_STATUS_LABELS[status as keyof typeof PROCESSING_STATUS_LABELS] || status;

    // Show rejection indicator if there's feedback
    if (status === 'content_writing' && approvalFeedback) {
      return (
        <Tooltip title="Rejected - See feedback">
          <Chip
            label="Needs Revision"
            size="small"
            sx={{
              bgcolor: '#ef4444' + '20',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
            icon={<WarningIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
          />
        </Tooltip>
      );
    }

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: color + '20',
          color: color,
          fontWeight: 600,
          fontSize: '0.75rem'
        }}
      />
    );
  };

  // Group tasks by order_id to calculate per-order processing payment
  const groupedByOrder = tasks.reduce((acc, task) => {
    const orderId = task.order_id;
    if (!acc[orderId]) {
      acc[orderId] = {
        order: task.order,
        items: [],
        totalProcessingPayment: 0
      };
    }
    acc[orderId].items.push(task);
    acc[orderId].totalProcessingPayment += task.processing_payment || 0;
    return acc;
  }, {} as Record<string, { order: ProcessingOrderItem['order'], items: ProcessingOrderItem[], totalProcessingPayment: number }>);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            All Processing Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All orders with "Show on Processing" enabled - {tasks.length} item{tasks.length !== 1 ? 's' : ''} across {Object.keys(groupedByOrder).length} order{Object.keys(groupedByOrder).length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </Box>

      {/* Processing Payment Summary Card */}
      {stats && (
        <Card sx={{ mb: 3, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981'
                  }}
                >
                  <MoneyIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Processing Payment
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {formatCurrency(stats.total_processing_payment || 0)}
                  </Typography>
                </Box>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2" color="text.secondary">
                  Total Tasks: {stats.total_tasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress: {Number(stats.in_progress_count || 0) + Number(stats.content_writing_count || 0)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Website, keyword, client..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="content_writing">Content Writing</MenuItem>
                  <MenuItem value="pending_approval">Pending Approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="publishing">Publishing</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="text"
                onClick={() => setFilters({ search: '' })}
                sx={{ mt: 0.5 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No processing tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No orders with "Show on Processing" enabled match the current filters.
          </Typography>
        </Paper>
      )}

      {/* Tasks grouped by Order */}
      {!loading && !error && Object.keys(groupedByOrder).length > 0 && (
        <Box>
          {Object.entries(groupedByOrder).map(([orderId, { order, items, totalProcessingPayment }]) => (
            <Paper key={orderId} sx={{ mb: 3, overflow: 'hidden' }}>
              {/* Order Header */}
              <Box sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="h6" fontWeight="600" color="primary">
                        {order?.order_number || '-'}
                      </Typography>
                      {order?.assigned_to && (
                        <Chip
                          icon={<PersonIcon sx={{ fontSize: 14 }} />}
                          label={order.assigned_to.split('@')[0]}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" fontWeight="500">
                      {order?.client_name || '-'}
                      {order?.client_company && ` - ${order.client_company}`}
                    </Typography>
                    {order?.project_name && (
                      <Typography variant="caption" color="text.secondary">
                        Project: {order.project_name}
                      </Typography>
                    )}
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary" display="block">
                      Processing Payment
                    </Typography>
                    <Typography variant="h6" fontWeight="700" color="success.main">
                      {formatCurrency(totalProcessingPayment)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>
                {/* Client Contact Info */}
                <Box display="flex" gap={2} mt={1}>
                  {order?.client_email && (
                    <Typography variant="caption" color="text.secondary">
                      Email: {order.client_email}
                    </Typography>
                  )}
                  {order?.client_whatsapp && (
                    <Typography variant="caption" color="text.secondary">
                      WhatsApp: {order.client_whatsapp}
                    </Typography>
                  )}
                  {order?.due_date && (
                    <Typography variant="caption" color={isOverdue(order.due_date, 'in_progress') ? 'error.main' : 'text.secondary'}>
                      Due: {formatDate(order.due_date)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Items Table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Publication</TableCell>
                      <TableCell>Keyword</TableCell>
                      <TableCell>Client URL</TableCell>
                      <TableCell>Article</TableCell>
                      <TableCell>Live</TableCell>
                      <TableCell align="right">Processing Payment</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((task) => (
                      <TableRow key={task.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {task.website}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {task.keyword}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {task.client_url ? (
                            <Link
                              href={task.client_url.startsWith('http') ? task.client_url : `https://${task.client_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                maxWidth: 120,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {task.client_url.replace(/^https?:\/\//, '').slice(0, 15)}...
                              <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {task.content_url ? (
                            <Link
                              href={task.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                              View <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {task.live_url ? (
                            <Link
                              href={task.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                              View <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="600" color="success.main">
                            {formatCurrency(task.processing_payment)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(task.processing_status, task.approval_feedback)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

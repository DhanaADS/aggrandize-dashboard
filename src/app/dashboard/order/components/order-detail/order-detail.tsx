'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonAdd as PersonAddIcon,
  PersonOff as PersonOffIcon,
  Inventory as InventoryIcon,
  Create as ManualIcon,
} from '@mui/icons-material';
import {
  Order,
  OrderItem,
  OrderPayment,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  PAYMENT_METHODS,
  OrderItemStatus,
  PROCESSING_STATUS_COLORS,
  PROCESSING_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  OrderItemAssignment,
} from '@/types/orders';
import { AssignmentDialog, AssignmentFormData } from './assignment-dialog';
import { ContentApprovalDialog } from './content-approval-dialog';

interface OrderDetailProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dialog states
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    website: '',
    keyword: '',
    client_url: '',
    price: 0,
    status: 'pending' as OrderItemStatus,
    live_url: '',
    notes: '',
  });

  // Website mode: 'inventory' (autocomplete from inventory) or 'manual' (free text)
  const [websiteMode, setWebsiteMode] = useState<'inventory' | 'manual'>('manual');
  const [inventoryItems, setInventoryItems] = useState<{ website_name: string; website_url: string }[]>([]);
  const [useDefaultKeyword, setUseDefaultKeyword] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: '',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/order/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Failed to load order');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder, refreshTrigger]);

  // Fetch inventory items for autocomplete
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory?limit=500');
        const data = await response.json();
        if (data.success && data.items) {
          setInventoryItems(data.items.map((item: { website_name: string; website_url: string }) => ({
            website_name: item.website_name,
            website_url: item.website_url,
          })));
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
      }
    };
    fetchInventory();
  }, []);

  // Update keyword when using default keyword
  useEffect(() => {
    if (useDefaultKeyword && order?.default_keyword && !editingItem) {
      setItemForm(prev => ({ ...prev, keyword: order.default_keyword || '' }));
    }
  }, [useDefaultKeyword, order?.default_keyword, editingItem]);

  // Handler for updating order settings
  const handleUpdateOrderSetting = async (field: string, value: boolean | string) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await response.json();
      if (data.success) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(data.error || `Failed to update ${field}`);
      }
    } catch (err) {
      alert(`Failed to update ${field}`);
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

  // Item handlers
  const handleAddItem = async () => {
    try {
      const response = await fetch(`/api/order/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowItemDialog(false);
        resetItemForm();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch (err) {
      alert('Failed to add item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      const response = await fetch(`/api/order/${orderId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: editingItem.id, ...itemForm }),
      });
      const data = await response.json();
      if (data.success) {
        setShowItemDialog(false);
        setEditingItem(null);
        resetItemForm();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to update item');
      }
    } catch (err) {
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const response = await fetch(`/api/order/${orderId}/items?item_id=${itemId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to delete item');
      }
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  // Payment handlers
  const handleAddPayment = async () => {
    try {
      const response = await fetch(`/api/order/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowPaymentDialog(false);
        resetPaymentForm();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to add payment');
      }
    } catch (err) {
      alert('Failed to add payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return;
    try {
      const response = await fetch(`/api/order/${orderId}/payments?payment_id=${paymentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to delete payment');
      }
    } catch (err) {
      alert('Failed to delete payment');
    }
  };

  const resetItemForm = () => {
    setItemForm({
      website: '',
      keyword: '',
      client_url: '',
      price: 0,
      status: 'pending',
      live_url: '',
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      payment_method: '',
      reference_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const openEditItem = (item: OrderItem) => {
    setEditingItem(item);
    setItemForm({
      website: item.website,
      keyword: item.keyword,
      client_url: item.client_url,
      price: item.price,
      status: item.status,
      live_url: item.live_url || '',
      notes: item.notes || '',
    });
    setShowItemDialog(true);
  };

  // Assignment handlers
  const handleAssignItem = async (formData: AssignmentFormData) => {
    if (!selectedItem) return;

    const response = await fetch(`/api/order/${orderId}/items/${selectedItem.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to assign item');
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!selectedItem) return;

    const response = await fetch(`/api/order/${orderId}/items/${selectedItem.id}/assign?assignment_id=${assignmentId}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to remove assignment');
    }

    // Update selectedItem's assignments in state to reflect the removal
    setSelectedItem({
      ...selectedItem,
      assignments: (selectedItem.assignments || []).filter(a => a.id !== assignmentId),
    });
    setRefreshTrigger((prev) => prev + 1);
  };

  const openAssignmentDialog = (item: OrderItem) => {
    setSelectedItem(item);
    setShowAssignmentDialog(true);
  };

  // Approval handlers
  const handleApproveContent = async () => {
    if (!selectedItem) return;

    const response = await fetch(`/api/order/${orderId}/items/${selectedItem.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to approve content');
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRejectContent = async (rejectionReason: string) => {
    if (!selectedItem) return;

    const response = await fetch(`/api/order/${orderId}/items/${selectedItem.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to reject content');
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const openApprovalDialog = (item: OrderItem) => {
    setSelectedItem(item);
    setShowApprovalDialog(true);
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Alert severity="error">
        {error || 'Order not found'}
        <Button size="small" onClick={fetchOrder} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Order Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h5" fontWeight="700">
                  {order.order_number}
                </Typography>
                <Chip
                  label={ORDER_STATUS_LABELS[order.status]}
                  size="small"
                  sx={{
                    bgcolor: `${ORDER_STATUS_COLORS[order.status]}20`,
                    color: ORDER_STATUS_COLORS[order.status],
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={PAYMENT_STATUS_LABELS[order.payment_status]}
                  size="small"
                  sx={{
                    bgcolor: `${PAYMENT_STATUS_COLORS[order.payment_status]}20`,
                    color: PAYMENT_STATUS_COLORS[order.payment_status],
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body1" fontWeight="600">
                {order.client_name}
              </Typography>
              {order.client_company && (
                <Typography variant="body2" color="text.secondary">
                  {order.client_company}
                </Typography>
              )}
              {order.client_email && (
                <Typography variant="body2" color="text.secondary">
                  {order.client_email}
                </Typography>
              )}
              {order.project_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Project: {order.project_name}
                </Typography>
              )}
              {/* Order Settings Toggles */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Tooltip title="When enabled, this order and its items appear on the Processing page">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={order.show_on_processing ?? true}
                        onChange={(e) => handleUpdateOrderSetting('show_on_processing', e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {order.show_on_processing ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        <Typography variant="body2">Show on Processing</Typography>
                      </Box>
                    }
                  />
                </Tooltip>
                <Tooltip title="When enabled, team members can be assigned to items">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={order.enable_assignments ?? true}
                        onChange={(e) => handleUpdateOrderSetting('enable_assignments', e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {order.enable_assignments ? <PersonAddIcon fontSize="small" /> : <PersonOffIcon fontSize="small" />}
                        <Typography variant="body2">Enable Assignments</Typography>
                      </Box>
                    }
                  />
                </Tooltip>
              </Box>
              {/* Default Keyword */}
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  label="Default Keyword"
                  value={order.default_keyword || ''}
                  onChange={(e) => handleUpdateOrderSetting('default_keyword', e.target.value)}
                  placeholder="Auto-fill for new items"
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  (applies to all new items)
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Order Date
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {formatDate(order.order_date)}
                    </Typography>
                  </Grid>
                  {order.due_date && (
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {formatDate(order.due_date)}
                      </Typography>
                    </Grid>
                  )}
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="body2" fontWeight="700" color="primary.main">
                      {formatCurrency(order.total_amount)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="700"
                      color={order.balance_due > 0 ? 'warning.main' : 'success.main'}
                    >
                      {formatCurrency(order.balance_due)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              Publications ({order.items?.length || 0})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                resetItemForm();
                setEditingItem(null);
                setShowItemDialog(true);
              }}
            >
              Add Publication
            </Button>
          </Box>

          {!order.items || order.items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No publications added yet</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Website</TableCell>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Client URL</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Processing Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Live URL</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => {
                    const isPendingApproval = item.processing_status === 'pending_approval';
                    // Check if any assignment is overdue
                    const overdueAssignments = (item.assignments || []).filter(a =>
                      a.due_date && new Date(a.due_date) < new Date() && item.processing_status !== 'approved'
                    );
                    const hasOverdue = overdueAssignments.length > 0;

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {item.website}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.keyword}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.client_url}
                          >
                            {item.client_url}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="600">
                            {formatCurrency(item.price)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ITEM_STATUS_LABELS[item.status]}
                            size="small"
                            sx={{
                              bgcolor: `${ITEM_STATUS_COLORS[item.status]}20`,
                              color: ITEM_STATUS_COLORS[item.status],
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {item.processing_status ? (
                            <Chip
                              label={PROCESSING_STATUS_LABELS[item.processing_status] || item.processing_status}
                              size="small"
                              sx={{
                                bgcolor: `${PROCESSING_STATUS_COLORS[item.processing_status] || '#64748b'}20`,
                                color: PROCESSING_STATUS_COLORS[item.processing_status] || '#64748b',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {(item.assignments && item.assignments.length > 0) ? (
                              <>
                                {item.assignments.map((assignment) => {
                                  const isAssignmentOverdue = assignment.due_date
                                    && new Date(assignment.due_date) < new Date()
                                    && item.processing_status !== 'approved';
                                  return (
                                    <Box
                                      key={assignment.id}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.25,
                                        p: 0.5,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                      }}
                                    >
                                      <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                                        {assignment.assigned_to.split('@')[0]}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Chip
                                          label={PRIORITY_LABELS[assignment.priority]}
                                          size="small"
                                          sx={{
                                            bgcolor: `${PRIORITY_COLORS[assignment.priority]}20`,
                                            color: PRIORITY_COLORS[assignment.priority],
                                            fontSize: '0.6rem',
                                            height: 16,
                                          }}
                                        />
                                        {isAssignmentOverdue && (
                                          <Chip
                                            label="Overdue"
                                            size="small"
                                            sx={{
                                              bgcolor: '#ef444420',
                                              color: '#ef4444',
                                              fontSize: '0.6rem',
                                              height: 16,
                                            }}
                                          />
                                        )}
                                        {assignment.due_date && (
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                            Due: {formatDate(assignment.due_date)}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                                {(order.enable_assignments ?? true) && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => openAssignmentDialog(item)}
                                    sx={{ fontSize: '0.65rem', alignSelf: 'flex-start', mt: 0.5, p: 0.5 }}
                                    startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
                                  >
                                    Add
                                  </Button>
                                )}
                              </>
                            ) : (order.enable_assignments ?? true) ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openAssignmentDialog(item)}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Assign
                              </Button>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.live_url ? (
                            <IconButton
                              size="small"
                              href={item.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: 'success.main' }}
                            >
                              <LinkIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {isPendingApproval && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => openApprovalDialog(item)}
                                sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
                              >
                                Review
                              </Button>
                            )}
                            <IconButton size="small" onClick={() => openEditItem(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteItem(item.id)}
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

          {order.items && order.items.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body1" fontWeight="600">
                    {formatCurrency(order.subtotal)}
                  </Typography>
                </Box>
                {order.discount > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Discount
                    </Typography>
                    <Typography variant="body1" fontWeight="600" color="error.main">
                      -{formatCurrency(order.discount)}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight="700" color="primary.main">
                    {formatCurrency(order.total_amount)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              Payments ({order.payments?.length || 0})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<PaymentIcon />}
              onClick={() => {
                resetPaymentForm();
                setShowPaymentDialog(true);
              }}
              disabled={order.balance_due <= 0}
            >
              Record Payment
            </Button>
          </Box>

          {!order.payments || order.payments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No payments recorded yet</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.payments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>
                        <Typography variant="body2">{formatDate(payment.payment_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{payment.payment_method || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{payment.reference_number || '-'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="600" color="success.main">
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {payment.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePayment(payment.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Payment Summary */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
                <Typography variant="body1" fontWeight="600" color="success.main">
                  {formatCurrency(order.amount_paid)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Balance Due
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="700"
                  color={order.balance_due > 0 ? 'warning.main' : 'success.main'}
                >
                  {formatCurrency(order.balance_due)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onClose={() => setShowItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Publication' : 'Add Publication'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Website Mode Toggle (only for new items) */}
            {!editingItem && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Website Mode:</Typography>
                  <ToggleButtonGroup
                    value={websiteMode}
                    exclusive
                    onChange={(_, newMode) => {
                      if (newMode) {
                        setWebsiteMode(newMode);
                        setItemForm({ ...itemForm, website: '' });
                      }
                    }}
                    size="small"
                  >
                    <ToggleButton value="inventory" sx={{ px: 2, py: 0.5 }}>
                      <InventoryIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                      <Typography variant="body2">Inventory</Typography>
                    </ToggleButton>
                    <ToggleButton value="manual" sx={{ px: 2, py: 0.5 }}>
                      <ManualIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                      <Typography variant="body2">Manual</Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* Website field - Autocomplete for inventory mode, TextField for manual */}
              {!editingItem && websiteMode === 'inventory' ? (
                <Autocomplete
                  options={inventoryItems}
                  getOptionLabel={(option) => option.website_name || ''}
                  value={inventoryItems.find(i => i.website_name === itemForm.website) || null}
                  onChange={(_, newValue) => {
                    setItemForm({ ...itemForm, website: newValue?.website_name || '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Website (from inventory)"
                      required
                      placeholder="Search inventory..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.website_name}>
                      <Box>
                        <Typography variant="body2" fontWeight="600">{option.website_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{option.website_url}</Typography>
                      </Box>
                    </li>
                  )}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Website"
                  required
                  value={itemForm.website}
                  onChange={(e) => setItemForm({ ...itemForm, website: e.target.value })}
                  disabled={!!editingItem}
                  placeholder={editingItem ? '' : 'Enter website name...'}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Price ($)"
                type="number"
                required
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Keyword"
                  required
                  value={itemForm.keyword}
                  onChange={(e) => {
                    setItemForm({ ...itemForm, keyword: e.target.value });
                    if (useDefaultKeyword && e.target.value !== order?.default_keyword) {
                      setUseDefaultKeyword(false);
                    }
                  }}
                />
                {!editingItem && order?.default_keyword && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useDefaultKeyword}
                        onChange={(e) => {
                          setUseDefaultKeyword(e.target.checked);
                          if (e.target.checked) {
                            setItemForm({ ...itemForm, keyword: order.default_keyword || '' });
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Tooltip title={`Use default: "${order.default_keyword}"`}>
                        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                          Use default
                        </Typography>
                      </Tooltip>
                    }
                    sx={{ ml: 0, mt: 0.5 }}
                  />
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Client URL"
                required
                value={itemForm.client_url}
                onChange={(e) => setItemForm({ ...itemForm, client_url: e.target.value })}
              />
            </Grid>
            {editingItem && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={itemForm.status}
                      label="Status"
                      onChange={(e) =>
                        setItemForm({ ...itemForm, status: e.target.value as OrderItemStatus })
                      }
                    >
                      {Object.entries(ITEM_STATUS_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Live URL"
                    value={itemForm.live_url}
                    onChange={(e) => setItemForm({ ...itemForm, live_url: e.target.value })}
                  />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowItemDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editingItem ? handleUpdateItem : handleAddItem}
            disabled={!itemForm.website || !itemForm.keyword || !itemForm.client_url || itemForm.price <= 0}
          >
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Balance Due: {formatCurrency(order.balance_due)}
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Amount ($)"
                type="number"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                inputProps={{ min: 0.01, step: 0.01, max: order.balance_due }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.payment_method}
                  label="Payment Method"
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <MenuItem key={method} value={method}>
                      {method}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Reference Number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddPayment}
            disabled={paymentForm.amount <= 0 || paymentForm.amount > order.balance_due}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      {selectedItem && (
        <AssignmentDialog
          open={showAssignmentDialog}
          onClose={() => setShowAssignmentDialog(false)}
          onSubmit={handleAssignItem}
          onRemoveAssignment={handleRemoveAssignment}
          itemDetails={{
            website: selectedItem.website,
            keyword: selectedItem.keyword,
          }}
          existingAssignments={selectedItem.assignments || []}
        />
      )}

      {/* Content Approval Dialog */}
      {selectedItem && (
        <ContentApprovalDialog
          open={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
          onApprove={handleApproveContent}
          onReject={handleRejectContent}
          itemDetails={{
            website: selectedItem.website,
            keyword: selectedItem.keyword,
            live_url: selectedItem.live_url || undefined,
          }}
        />
      )}
    </Box>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonAdd as PersonAddIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import {
  Order,
  OrderStatus,
  CreateOrderInput,
  UpdateOrderInput,
  CreateOrderItemInput,
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
} from '@/types/orders';
import { WebsiteInventory } from '@/types/inventory';
import { PublicationSelector } from '../publication-selector';

// All team members for assignment
const ALL_TEAM_MEMBERS = [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhana' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul' },
  { email: 'thelaurakeen@gmail.com', name: 'Laura Keen' },
];

interface OrderFormProps {
  order: Order | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PublicationItem {
  publication_id?: string;
  website: string;
  keyword: string;
  client_url: string;
  price: number;
  notes: string;
}

export function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOrderNumber, setNextOrderNumber] = useState<string>('');
  const [loadingOrderNumber, setLoadingOrderNumber] = useState(false);
  const [formData, setFormData] = useState<CreateOrderInput & { status?: OrderStatus }>({
    client_name: '',
    client_email: '',
    client_company: '',
    client_whatsapp: '',
    client_telegram: '',
    project_name: '',
    order_date: new Date().toISOString().split('T')[0],
    due_date: '',
    discount: 0,
    notes: '',
    assigned_to: '',
    default_keyword: '',
    show_on_processing: true,
    enable_assignments: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Publications state
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<WebsiteInventory | null>(null);
  const [pubForm, setPubForm] = useState({
    keyword: '',
    client_url: '',
    notes: '',
    price: 0,
  });
  const [pubErrors, setPubErrors] = useState<Record<string, string>>({});

  // Payment state (for new orders only)
  const [paymentOption, setPaymentOption] = useState<'none' | 'full' | 'half' | 'custom'>('none');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  // Fetch next order number for new orders
  useEffect(() => {
    if (!order) {
      const fetchNextOrderNumber = async () => {
        setLoadingOrderNumber(true);
        try {
          const response = await fetch('/api/order/next-number');
          const data = await response.json();
          if (data.success && data.orderNumber) {
            setNextOrderNumber(data.orderNumber);
          }
        } catch (err) {
          console.error('Failed to fetch next order number:', err);
        } finally {
          setLoadingOrderNumber(false);
        }
      };
      fetchNextOrderNumber();
    }
  }, [order]);

  useEffect(() => {
    if (order) {
      setFormData({
        client_name: order.client_name,
        client_email: order.client_email || '',
        client_company: order.client_company || '',
        client_whatsapp: order.client_whatsapp || '',
        client_telegram: order.client_telegram || '',
        project_name: order.project_name || '',
        order_date: order.order_date,
        due_date: order.due_date || '',
        discount: order.discount,
        notes: order.notes || '',
        status: order.status,
        assigned_to: order.assigned_to || '',
        default_keyword: order.default_keyword || '',
        show_on_processing: order.show_on_processing ?? true,
        enable_assignments: order.enable_assignments ?? true,
      });
    }
  }, [order]);

  // When publication is selected, auto-fill price
  useEffect(() => {
    if (selectedPublication) {
      setPubForm(prev => ({
        ...prev,
        price: selectedPublication.client_price || 0,
      }));
    }
  }, [selectedPublication]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Client name is required';
    }

    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Invalid email format';
    }

    if (formData.discount && formData.discount < 0) {
      newErrors.discount = 'Discount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePubForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedPublication) {
      newErrors.publication = 'Please select a publication';
    }

    if (!pubForm.keyword?.trim()) {
      newErrors.keyword = 'Keyword is required';
    }

    if (!pubForm.client_url?.trim()) {
      newErrors.client_url = 'Client URL is required';
    }

    if (pubForm.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    setPubErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPublication = () => {
    if (!validatePubForm() || !selectedPublication) return;

    const newPub: PublicationItem = {
      publication_id: selectedPublication.id,
      website: selectedPublication.website,
      keyword: pubForm.keyword,
      client_url: pubForm.client_url,
      price: Number(pubForm.price) || 0,
      notes: pubForm.notes,
    };

    setPublications([...publications, newPub]);

    // Reset form
    setSelectedPublication(null);
    setPubForm({
      keyword: '',
      client_url: '',
      notes: '',
      price: 0,
    });
    setPubErrors({});
  };

  const handleRemovePublication = (index: number) => {
    setPublications(publications.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return publications.reduce((sum, pub) => sum + Number(pub.price), 0);
  };

  const getOrderTotal = () => {
    return calculateSubtotal() - (formData.discount || 0);
  };

  const getPaymentAmount = () => {
    const total = getOrderTotal();
    switch (paymentOption) {
      case 'full': return total;
      case 'half': return Math.round(total / 2 * 100) / 100;
      case 'custom': return customAmount;
      default: return 0;
    }
  };

  const getBalanceDue = () => {
    return getOrderTotal() - getPaymentAmount();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const url = order ? `/api/order/${order.id}` : '/api/order';
      const method = order ? 'PUT' : 'POST';

      // Build payload
      const payload: CreateOrderInput | UpdateOrderInput = {
        client_name: formData.client_name,
        client_email: formData.client_email || undefined,
        client_company: formData.client_company || undefined,
        client_whatsapp: formData.client_whatsapp || undefined,
        client_telegram: formData.client_telegram || undefined,
        project_name: formData.project_name || undefined,
        order_date: formData.order_date || undefined,
        due_date: formData.due_date || undefined,
        discount: formData.discount || 0,
        notes: formData.notes || undefined,
        default_keyword: formData.default_keyword || undefined,
        show_on_processing: formData.show_on_processing,
        enable_assignments: formData.enable_assignments,
      };

      if (order && formData.status) {
        (payload as UpdateOrderInput).status = formData.status;
      }

      // For new orders, include items
      if (!order && publications.length > 0) {
        (payload as CreateOrderInput).items = publications.map(pub => ({
          publication_id: pub.publication_id,
          website: pub.website,
          keyword: pub.keyword,
          client_url: pub.client_url,
          price: pub.price,
          notes: pub.notes || undefined,
        }));
      }

      // Add assigned_to to payload
      if (formData.assigned_to) {
        (payload as CreateOrderInput).assigned_to = formData.assigned_to;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // For new orders, record upfront payment if selected
        if (!order && paymentOption !== 'none' && getPaymentAmount() > 0) {
          const orderId = data.order?.id;
          if (orderId) {
            try {
              const paymentPayload = {
                amount: getPaymentAmount(),
                payment_method: paymentMethod || undefined,
                reference_number: referenceNumber || undefined,
                payment_date: new Date().toISOString().split('T')[0],
                notes: `Upfront payment (${paymentOption === 'full' ? '100%' : paymentOption === 'half' ? '50%' : 'custom'})`,
              };

              const paymentResponse = await fetch(`/api/order/${orderId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentPayload),
              });

              const paymentData = await paymentResponse.json();
              if (!paymentData.success) {
                console.warn('Failed to record payment:', paymentData.error);
              }
            } catch (paymentErr) {
              console.warn('Error recording payment:', paymentErr);
            }
          }
        }
        onSuccess();
      } else {
        setError(data.error || 'Failed to save order');
      }
    } catch (err) {
      setError('Failed to save order');
      console.error('Error saving order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    const value = e.target.value;
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handlePubFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'price' ? Number(e.target.value) : e.target.value;
    setPubForm({ ...pubForm, [field]: value });
    if (pubErrors[field]) {
      setPubErrors({ ...pubErrors, [field]: '' });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            {order ? 'Edit Order' : 'New Order'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order ? `Editing ${order.order_number}` : 'Create a new order for a client'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<CloseIcon />} onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Client Information */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Client Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Client Name"
            required
            value={formData.client_name}
            onChange={handleChange('client_name')}
            error={!!errors.client_name}
            helperText={errors.client_name}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Company"
            value={formData.client_company}
            onChange={handleChange('client_company')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.client_email}
            onChange={handleChange('client_email')}
            error={!!errors.client_email}
            helperText={errors.client_email}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="WhatsApp"
            placeholder="+1 234 567 8900"
            value={formData.client_whatsapp}
            onChange={handleChange('client_whatsapp')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <WhatsAppIcon sx={{ color: '#25D366' }} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Telegram"
            placeholder="@username"
            value={formData.client_telegram}
            onChange={handleChange('client_telegram')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TelegramIcon sx={{ color: '#0088cc' }} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Order Details */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Order Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Order Number"
            value={order ? order.order_number : nextOrderNumber}
            InputProps={{
              readOnly: true,
              startAdornment: loadingOrderNumber ? (
                <InputAdornment position="start">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : undefined,
            }}
            helperText={!order ? 'Auto-generated' : undefined}
            sx={{
              '& .MuiInputBase-input': {
                fontWeight: 600,
                color: 'primary.main',
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Project Name"
            value={formData.project_name}
            onChange={handleChange('project_name')}
            placeholder="e.g., Q1 2025 Campaign"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Order Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formData.order_date}
            onChange={handleChange('order_date')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formData.due_date}
            onChange={handleChange('due_date')}
          />
        </Grid>
        {order && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status || order.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
              >
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Discount ($)"
            type="number"
            value={formData.discount}
            onChange={handleChange('discount')}
            error={!!errors.discount}
            helperText={errors.discount}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={formData.assigned_to || ''}
              label="Assign To"
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            >
              <MenuItem value="">Not Assigned</MenuItem>
              {ALL_TEAM_MEMBERS.map((member) => (
                <MenuItem key={member.email} value={member.email}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Default Keyword"
            value={formData.default_keyword}
            onChange={handleChange('default_keyword')}
            placeholder="Auto-fill for all publications"
            helperText="Applied to all publications in this order"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Tooltip title="When enabled, this order and its items will appear on the Processing page">
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.show_on_processing ?? true}
                    onChange={(e) => setFormData({ ...formData, show_on_processing: e.target.checked })}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.show_on_processing ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    <Typography variant="body2">Show on Processing</Typography>
                  </Box>
                }
              />
            </Tooltip>
            <Tooltip title="When enabled, team members can be assigned to items in this order">
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enable_assignments ?? true}
                    onChange={(e) => setFormData({ ...formData, enable_assignments: e.target.checked })}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.enable_assignments ? <PersonAddIcon fontSize="small" /> : <PersonOffIcon fontSize="small" />}
                    <Typography variant="body2">Enable Assignments</Typography>
                  </Box>
                }
              />
            </Tooltip>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Publications Section - Only for new orders */}
      {!order && (
        <>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            Publications
          </Typography>

          {/* Add Publication Form */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid size={{ xs: 12, md: 4 }}>
                <PublicationSelector
                  value={selectedPublication}
                  onChange={setSelectedPublication}
                  error={!!pubErrors.publication}
                  helperText={pubErrors.publication}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Keyword"
                  value={pubForm.keyword}
                  onChange={handlePubFormChange('keyword')}
                  error={!!pubErrors.keyword}
                  helperText={pubErrors.keyword}
                  placeholder="Target keyword"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Client URL"
                  value={pubForm.client_url}
                  onChange={handlePubFormChange('client_url')}
                  error={!!pubErrors.client_url}
                  helperText={pubErrors.client_url}
                  placeholder="https://..."
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={pubForm.price}
                  onChange={handlePubFormChange('price')}
                  error={!!pubErrors.price}
                  helperText={pubErrors.price}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 1.5 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={pubForm.notes}
                  onChange={handlePubFormChange('notes')}
                  placeholder="Optional"
                />
              </Grid>
            </Grid>

            {/* Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPublication}
                sx={{ minWidth: 120 }}
              >
                Add Publication
              </Button>
            </Box>
          </Paper>

          {/* Publications List */}
          {publications.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Website</TableCell>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Client URL</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {publications.map((pub, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {pub.website}
                        </Typography>
                      </TableCell>
                      <TableCell>{pub.keyword}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pub.client_url}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">${Number(pub.price).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemovePublication(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <Typography variant="subtitle1" fontWeight={600}>
                        Subtotal:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight={600} color="primary">
                        ${calculateSubtotal().toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Upfront Payment Section */}
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            Upfront Payment (Optional)
          </Typography>
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Grid container spacing={3}>
              {/* Payment Amount Options */}
              <Grid size={{ xs: 12 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 1 }}>Payment Amount</FormLabel>
                  <RadioGroup
                    row
                    value={paymentOption}
                    onChange={(e) => setPaymentOption(e.target.value as 'none' | 'full' | 'half' | 'custom')}
                  >
                    <FormControlLabel value="none" control={<Radio />} label="No Payment" />
                    <FormControlLabel
                      value="full"
                      control={<Radio />}
                      label={`Full ($${getOrderTotal().toFixed(2)})`}
                      disabled={getOrderTotal() <= 0}
                    />
                    <FormControlLabel
                      value="half"
                      control={<Radio />}
                      label={`50% ($${(getOrderTotal() / 2).toFixed(2)})`}
                      disabled={getOrderTotal() <= 0}
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label="Custom"
                      disabled={getOrderTotal() <= 0}
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Custom Amount Input */}
              {paymentOption === 'custom' && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Custom Amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                    inputProps={{ min: 0, max: getOrderTotal(), step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    error={customAmount > getOrderTotal()}
                    helperText={customAmount > getOrderTotal() ? 'Cannot exceed order total' : ''}
                  />
                </Grid>
              )}

              {/* Payment Method & Reference (shown when payment > 0) */}
              {paymentOption !== 'none' && (
                <>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <MenuItem key={method} value={method}>
                            {method}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Reference Number"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Transaction ID (optional)"
                    />
                  </Grid>
                </>
              )}

              {/* Order Summary */}
              {publications.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mt: 2 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        Order Total
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        ${getOrderTotal().toFixed(2)}
                      </Typography>
                    </Box>
                    {paymentOption !== 'none' && (
                      <>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary">
                            Upfront Payment
                          </Typography>
                          <Typography variant="h6" fontWeight={600} color="success.main">
                            ${getPaymentAmount().toFixed(2)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary">
                            Balance Due
                          </Typography>
                          <Typography variant="h6" fontWeight={600} color={getBalanceDue() > 0 ? 'warning.main' : 'success.main'}>
                            ${getBalanceDue().toFixed(2)}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Notes */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Additional Notes
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Notes"
        value={formData.notes}
        onChange={handleChange('notes')}
        placeholder="Any additional information about this order..."
      />

      {/* Info Box for Editing Orders */}
      {order && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Publications (items) and payments can be managed from the order detail view.
        </Alert>
      )}
    </Box>
  );
}

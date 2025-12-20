'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { ProcessingPaymentRequest, ProcessingOrderItem } from '@/types/processing';
import { PaymentRequestForm } from '../payment-request/payment-request-form';
import { MyRequests } from '../payment-request/my-requests';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

export function PaymentStatusTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [paymentRequests, setPaymentRequests] = useState<ProcessingPaymentRequest[]>([]);
  const [publishedItems, setPublishedItems] = useState<ProcessingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProcessingOrderItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payment requests
      const requestsResponse = await fetch(`/api/processing/payment-requests?requested_by=${user?.name || user?.email?.split('@')[0]}`);
      if (!requestsResponse.ok) throw new Error('Failed to fetch payment requests');
      const requestsData = await requestsResponse.json();
      setPaymentRequests(requestsData);

      // Fetch published items without payment requests
      const itemsParams = new URLSearchParams({
        assigned_to: user?.name || user?.email?.split('@')[0] || '',
        status: 'published'
      });
      const itemsResponse = await fetch(`/api/processing?${itemsParams.toString()}`);
      if (!itemsResponse.ok) throw new Error('Failed to fetch published items');
      const itemsData = await itemsResponse.json();

      // Filter out items that already have payment requests
      const itemsWithoutRequests = itemsData.filter((item: ProcessingOrderItem) =>
        !requestsData.some((req: ProcessingPaymentRequest) => req.order_item_id === item.id)
      );
      setPublishedItems(itemsWithoutRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayment = (item: ProcessingOrderItem) => {
    setSelectedItem(item);
    setShowRequestForm(true);
  };

  const handleRequestSuccess = () => {
    fetchData();
    setShowRequestForm(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const pendingRequests = paymentRequests.filter(r => r.status === 'pending');
  const approvedRequests = paymentRequests.filter(r => r.status === 'approved');
  const paidRequests = paymentRequests.filter(r => r.status === 'paid');
  const rejectedRequests = paymentRequests.filter(r => r.status === 'rejected');

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="600" gutterBottom>
          Payment Status
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your payment requests and track payment status
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b'
                  }}
                >
                  <PaymentIcon />
                </Box>
                <Typography variant="h4" fontWeight="700" color="#f59e0b">
                  {pendingRequests.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6'
                  }}
                >
                  <CheckIcon />
                </Box>
                <Typography variant="h4" fontWeight="700" color="#3b82f6">
                  {approvedRequests.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981'
                  }}
                >
                  <CheckIcon />
                </Box>
                <Typography variant="h4" fontWeight="700" color="#10b981">
                  {paidRequests.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Paid
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981'
                  }}
                >
                  <PaymentIcon />
                </Box>
                <Typography variant="h4" fontWeight="700" color="#10b981">
                  {publishedItems.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Available to Request
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="My Requests" />
          <Tab label="Available Items" />
        </Tabs>
      </Box>

      {activeTab === 0 && <MyRequests requests={paymentRequests} />}

      {activeTab === 1 && (
        <Box>
          {publishedItems.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No items available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All your published items already have payment requests.
              </Typography>
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                You have {publishedItems.length} published item{publishedItems.length > 1 ? 's' : ''} available for payment request.
              </Alert>
              <Grid container spacing={3}>
                {publishedItems.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          {item.keyword}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {item.website}
                        </Typography>
                        {item.live_url && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Live URL: {item.live_url}
                          </Typography>
                        )}
                        {item.live_date && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Published: {new Date(item.live_date).toLocaleDateString()}
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => handleRequestPayment(item)}
                          fullWidth
                          sx={{ mt: 2 }}
                        >
                          Request Payment
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      )}

      {selectedItem && (
        <PaymentRequestForm
          orderItemId={selectedItem.id}
          website={selectedItem.website}
          keyword={selectedItem.keyword}
          userName={user?.name || user?.email?.split('@')[0] || ''}
          open={showRequestForm}
          onClose={() => {
            setShowRequestForm(false);
            setSelectedItem(null);
          }}
          onSuccess={handleRequestSuccess}
        />
      )}
    </Box>
  );
}

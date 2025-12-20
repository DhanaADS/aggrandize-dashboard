'use client';

import { useState, useEffect } from 'react';
import { ProcessingPaymentRequest, PaymentRequestStatus } from '@/types/processing';
import { RequestCard } from './request-card';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';

interface RequestsTabProps {
  statusFilter?: PaymentRequestStatus;
}

export function RequestsTab({ statusFilter }: RequestsTabProps) {
  const [requests, setRequests] = useState<ProcessingPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/accounts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch payment requests');
      const data = await response.json();
      setRequests(data.payment_requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpdated = () => {
    fetchRequests();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (requests.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No payment requests found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {statusFilter
            ? `No ${statusFilter} payment requests at this time.`
            : 'No payment requests have been submitted yet.'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Showing {requests.length} payment request{requests.length !== 1 ? 's' : ''}
      </Typography>

      <Grid container spacing={3}>
        {requests.map((request) => (
          <Grid item xs={12} md={6} lg={4} key={request.id}>
            <RequestCard request={request} onUpdate={handleRequestUpdated} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

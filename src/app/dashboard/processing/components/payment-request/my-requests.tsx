'use client';

import { ProcessingPaymentRequest } from '@/types/processing';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import {
  PAYMENT_REQUEST_STATUS_LABELS,
  PAYMENT_REQUEST_STATUS_COLORS,
  PROCESSING_PAYMENT_METHOD_LABELS
} from '@/types/processing';

interface MyRequestsProps {
  requests: ProcessingPaymentRequest[];
}

export function MyRequests({ requests }: MyRequestsProps) {
  if (requests.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No payment requests yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submit a payment request for published items to get paid.
        </Typography>
      </Box>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckIcon fontSize="small" />;
      case 'approved':
        return <CheckIcon fontSize="small" />;
      case 'rejected':
        return <CancelIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  return (
    <Grid container spacing={3}>
      {requests.map((request) => (
        <Grid item xs={12} md={6} key={request.id}>
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box flex={1}>
                  {request.order_item && (
                    <>
                      <Typography variant="h6" fontWeight="600" gutterBottom>
                        {request.order_item.keyword}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {request.order_item.website}
                      </Typography>
                    </>
                  )}
                </Box>
                <Chip
                  icon={getStatusIcon(request.status)}
                  label={PAYMENT_REQUEST_STATUS_LABELS[request.status]}
                  size="small"
                  sx={{
                    backgroundColor: PAYMENT_REQUEST_STATUS_COLORS[request.status] + '20',
                    color: PAYMENT_REQUEST_STATUS_COLORS[request.status],
                    fontWeight: 600,
                    border: `1px solid ${PAYMENT_REQUEST_STATUS_COLORS[request.status]}40`
                  }}
                />
              </Box>

              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="600" color="primary">
                    ${request.amount.toFixed(2)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body2">
                    {PROCESSING_PAYMENT_METHOD_LABELS[request.payment_method]}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Requested
                  </Typography>
                  <Typography variant="body2">
                    {new Date(request.requested_at).toLocaleDateString()}
                  </Typography>
                </Box>

                {request.paid_at && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Paid On
                    </Typography>
                    <Typography variant="body2" color="success.main" fontWeight="600">
                      {new Date(request.paid_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {request.payment_reference && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Reference
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {request.payment_reference}
                    </Typography>
                  </Box>
                )}

                {request.review_notes && (
                  <Box mt={1} p={1} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Review Notes:
                    </Typography>
                    <Typography variant="body2">
                      {request.review_notes}
                    </Typography>
                  </Box>
                )}

                {request.notes && (
                  <Box mt={1} p={1} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Notes:
                    </Typography>
                    <Typography variant="body2">
                      {request.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

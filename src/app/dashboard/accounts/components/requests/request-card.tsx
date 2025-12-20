'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Paid as PaidIcon,
  Person as PersonIcon,
  CalendarToday as DateIcon,
  Payment as PaymentIcon,
  Link as LinkIcon,
  Description as InvoiceIcon,
} from '@mui/icons-material';
import type { ProcessingPaymentRequest, PaymentRequestStatus } from '@/types/processing';
import { RequestDetailModal } from '../request-detail/request-detail-modal';
import styles from '../../accounts.module.css';

interface RequestCardProps {
  request: ProcessingPaymentRequest & {
    requester_full_name?: string;
    order_item?: {
      website: string;
      keyword: string;
      order?: {
        order_number: string;
        client_name: string;
        project_name: string | null;
      };
    };
  };
  onUpdate: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: PaymentRequestStatus): 'warning' | 'info' | 'error' | 'success' => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'info';
    case 'rejected': return 'error';
    case 'paid': return 'success';
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'wise': return '💳';
    case 'paypal': return '🅿️';
    case 'bank_transfer': return '🏦';
    default: return '💰';
  }
};

export function RequestCard({ request, onUpdate }: RequestCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const website = request.order_item?.website || 'Unknown Website';
  const keyword = request.order_item?.keyword || '';
  const orderNumber = request.order_item?.order?.order_number || '';
  const clientName = request.order_item?.order?.client_name || '';

  return (
    <>
      <Box className={styles.requestCard}>
        {/* Header */}
        <Box className={styles.requestHeader}>
          <Box>
            <Typography className={styles.requestWebsite}>
              {website}
            </Typography>
            {keyword && (
              <Typography className={styles.requestKeyword}>
                {keyword}
              </Typography>
            )}
            {orderNumber && (
              <Typography variant="caption" color="text.secondary">
                Order: {orderNumber}
              </Typography>
            )}
          </Box>
          <Chip
            label={request.status.replace('_', ' ').toUpperCase()}
            color={getStatusColor(request.status)}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Amount */}
        <Typography className={styles.requestAmount}>
          {formatCurrency(request.amount)}
        </Typography>

        {/* Details */}
        <Box className={styles.requestDetails}>
          <Box className={styles.detailRow}>
            <PaymentIcon className={styles.detailIcon} />
            <Typography variant="body2">
              <span className={styles.detailLabel}>Method:</span> {getPaymentMethodIcon(request.payment_method)} {request.payment_method.replace('_', ' ').toUpperCase()}
            </Typography>
          </Box>

          <Box className={styles.detailRow}>
            <PersonIcon className={styles.detailIcon} />
            <Typography variant="body2">
              <span className={styles.detailLabel}>Requested by:</span> {request.requester_full_name || request.requested_by}
            </Typography>
          </Box>

          <Box className={styles.detailRow}>
            <DateIcon className={styles.detailIcon} />
            <Typography variant="body2">
              <span className={styles.detailLabel}>Date:</span> {formatDate(request.requested_at)}
            </Typography>
          </Box>

          {clientName && (
            <Box className={styles.detailRow}>
              <PersonIcon className={styles.detailIcon} />
              <Typography variant="body2">
                <span className={styles.detailLabel}>Client:</span> {clientName}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Links */}
        {(request.recipient_account_details || request.payment_proof_url) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
            {request.recipient_account_details && (
              <Tooltip title="View payment details">
                <IconButton size="small" color="primary">
                  <InvoiceIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {request.payment_proof_url && (
              <Tooltip title="View payment proof">
                <IconButton
                  size="small"
                  color="primary"
                  component="a"
                  href={request.payment_proof_url}
                  target="_blank"
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Actions */}
        <Box className={styles.requestActions}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewIcon />}
            onClick={() => setShowDetailModal(true)}
            fullWidth
          >
            View Details
          </Button>

          {request.status === 'pending' && (
            <>
              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => setShowDetailModal(true)}
                fullWidth
              >
                Approve
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => setShowDetailModal(true)}
                fullWidth
              >
                Reject
              </Button>
            </>
          )}

          {request.status === 'approved' && (
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<PaidIcon />}
              onClick={() => setShowDetailModal(true)}
              fullWidth
            >
              Mark as Paid
            </Button>
          )}
        </Box>
      </Box>

      {showDetailModal && (
        <RequestDetailModal
          request={request}
          onClose={() => setShowDetailModal(false)}
          onUpdate={() => {
            setShowDetailModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}

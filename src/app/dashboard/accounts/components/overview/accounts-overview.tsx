'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Skeleton,
  Alert
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Paid as PaidIcon,
  AccountBalance as TotalIcon,
} from '@mui/icons-material';
import type { AccountsStats } from '@/types/processing';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

interface StatCardProps {
  title: string;
  value: string;
  amount?: string;
  icon: React.ReactNode;
  color: 'pending' | 'approved' | 'paid' | 'total';
}

const StatCard = ({ title, value, amount, icon, color }: StatCardProps) => {
  const colorMap = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#dbeafe', text: '#1d4ed8' },
    paid: { bg: '#dcfce7', text: '#166534' },
    total: { bg: '#f1f5f9', text: '#64748b' },
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight="600" textTransform="uppercase" letterSpacing="0.5px">
          {title}
        </Typography>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colorMap[color].bg,
            color: colorMap[color].text,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" fontWeight="800" sx={{ mb: 1 }}>
        {value}
      </Typography>
      {amount && (
        <Typography variant="body1" fontWeight="600" color="text.secondary">
          {amount}
        </Typography>
      )}
    </Paper>
  );
};

export function AccountsOverview() {
  const [stats, setStats] = useState<AccountsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/accounts/stats');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch statistics');
        }

        setStats(data.stats);
      } catch (err) {
        console.error('Error fetching accounts stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="700" sx={{ mb: 3 }}>
        Payment Requests Overview
      </Typography>

      <Grid container spacing={3}>
        {isLoading ? (
          Array.from(new Array(4)).map((_, i) => (
            <Grid item xs={12} md={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))
        ) : stats ? (
          <>
            <Grid item xs={12} md={6} lg={3}>
              <StatCard
                title="Total Requests"
                value={stats.total_requests.toString()}
                icon={<TotalIcon sx={{ fontSize: 28 }} />}
                color="total"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <StatCard
                title="Pending Review"
                value={stats.pending_count.toString()}
                amount={formatCurrency(stats.total_pending_amount)}
                icon={<PendingIcon sx={{ fontSize: 28 }} />}
                color="pending"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <StatCard
                title="Approved"
                value={stats.approved_count.toString()}
                amount={formatCurrency(stats.total_approved_amount)}
                icon={<ApprovedIcon sx={{ fontSize: 28 }} />}
                color="approved"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <StatCard
                title="Paid"
                value={stats.paid_count.toString()}
                amount={formatCurrency(stats.total_paid_amount)}
                icon={<PaidIcon sx={{ fontSize: 28 }} />}
                color="paid"
              />
            </Grid>
          </>
        ) : null}
      </Grid>

      {stats && (
        <Paper elevation={3} sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
          <Typography variant="h6" fontWeight="700" sx={{ mb: 2 }}>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600" textTransform="uppercase" fontSize="12px" mb={1}>
                  Pending Amount
                </Typography>
                <Typography variant="h5" fontWeight="800" color="#92400e">
                  {formatCurrency(stats.total_pending_amount)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600" textTransform="uppercase" fontSize="12px" mb={1}>
                  Approved Amount
                </Typography>
                <Typography variant="h5" fontWeight="800" color="#1d4ed8">
                  {formatCurrency(stats.total_approved_amount)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600" textTransform="uppercase" fontSize="12px" mb={1}>
                  Total Paid
                </Typography>
                <Typography variant="h5" fontWeight="800" color="#166534">
                  {formatCurrency(stats.total_paid_amount)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

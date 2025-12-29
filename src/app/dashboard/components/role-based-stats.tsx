'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Skeleton,
} from '@mui/material';
import {
  ShoppingCart,
  Assignment,
  CheckCircle,
  Pending,
  TrendingUp,
  ReceiptLong,
} from '@mui/icons-material';
import { RolePermissions } from '@/types/auth';

interface RoleBasedStatsProps {
  role?: string;
  permissions?: RolePermissions;
  userName?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard = ({ title, value, change, icon, color, loading }: StatCardProps) => (
  <Paper sx={{ p: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box sx={{
        width: 48,
        height: 48,
        borderRadius: 1,
        backgroundColor: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </Box>
      {change && (
        <Typography
          variant="body2"
          sx={{
            color: change.startsWith('+') ? 'success.main' : change.startsWith('-') ? 'error.main' : 'text.secondary',
            fontWeight: 600
          }}
        >
          {change}
        </Typography>
      )}
    </Box>
    {loading ? (
      <Skeleton variant="text" width="60%" height={40} />
    ) : (
      <Typography variant="h4" component="h3" fontWeight="700" sx={{ mb: 0.5 }}>
        {value}
      </Typography>
    )}
    <Typography variant="body2" color="text.secondary">
      {title}
    </Typography>
  </Paper>
);

export function RoleBasedStats({ role, permissions, userName }: RoleBasedStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats based on role/permissions
      // For now, we'll use placeholder data that matches the role
      // In production, this would call the appropriate API

      if (permissions?.canAccessOrder) {
        // Marketing role - fetch order stats
        try {
          const orderRes = await fetch('/api/order/stats?user=' + encodeURIComponent(userName || ''));
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            setStats({
              type: 'marketing',
              data: {
                totalOrders: orderData.totalOrders || 0,
                myOrders: orderData.myOrders || 0,
                pendingApproval: orderData.pendingApproval || 0,
                completed: orderData.completed || 0,
              },
            });
          } else {
            throw new Error('Failed to fetch order stats');
          }
        } catch {
          setStats({
            type: 'marketing',
            data: {
              totalOrders: 0,
              myOrders: 0,
              pendingApproval: 0,
              completed: 0,
            },
          });
        }
      } else if (permissions?.canAccessProcessing) {
        // Processing role - fetch task stats (uses session auth)
        try {
          const processingRes = await fetch('/api/processing/stats');
          if (processingRes.ok) {
            const processingData = await processingRes.json();
            const statsData = processingData.stats || {};
            setStats({
              type: 'processing',
              data: {
                myTasks: statsData.my_tasks_count || 0,
                completedToday: statsData.completed_count || 0,
                inProgress: statsData.in_progress_count || 0,
                pendingReview: statsData.pending_approval_count || 0,
              },
            });
          } else {
            throw new Error('Failed to fetch processing stats');
          }
        } catch {
          setStats({
            type: 'processing',
            data: {
              myTasks: 0,
              completedToday: 0,
              inProgress: 0,
              pendingReview: 0,
            },
          });
        }
      } else {
        // Default - show expense stats
        setStats({
          type: 'default',
          data: {
            myExpenses: 0,
            totalLogged: '₹0',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching role stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [permissions, userName]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Marketing Stats (Order Access)
  if (permissions?.canAccessOrder) {
    const data = stats?.data || {};
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="Orders This Month"
            value={data.totalOrders || 0}
            icon={<ShoppingCart />}
            color="#3b82f6"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="My Orders"
            value={data.myOrders || 0}
            icon={<Assignment />}
            color="#10b981"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="Pending Approval"
            value={data.pendingApproval || 0}
            icon={<Pending />}
            color="#f59e0b"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="Completed"
            value={data.completed || 0}
            icon={<CheckCircle />}
            color="#10b981"
            loading={loading}
          />
        </Grid>
      </Grid>
    );
  }

  // Processing Stats
  if (permissions?.canAccessProcessing) {
    const data = stats?.data || {};
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="My Tasks"
            value={data.myTasks || 0}
            icon={<Assignment />}
            color="#3b82f6"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="Completed Today"
            value={data.completedToday || 0}
            icon={<CheckCircle />}
            color="#10b981"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="In Progress"
            value={data.inProgress || 0}
            icon={<TrendingUp />}
            color="#8b5cf6"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <StatCard
            title="Pending Review"
            value={data.pendingReview || 0}
            icon={<Pending />}
            color="#f59e0b"
            loading={loading}
          />
        </Grid>
      </Grid>
    );
  }

  // Default Stats (for users with limited access)
  const data = stats?.data || {};
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={6} lg={3}>
        <StatCard
          title="My Expenses"
          value={data.myExpenses || 0}
          icon={<ReceiptLong />}
          color="#3b82f6"
          loading={loading}
        />
      </Grid>
      <Grid item xs={6} lg={3}>
        <StatCard
          title="Total Logged"
          value={data.totalLogged || '₹0'}
          icon={<TrendingUp />}
          color="#10b981"
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}

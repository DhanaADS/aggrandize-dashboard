'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { useRouter } from 'next/navigation';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';
import { DatabaseStatusIndicator } from '@/components/dashboard/DatabaseStatusIndicator';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  ShoppingCart,
  Assignment,
  Description,
  ReceiptLong,
  ListAlt,
  Forum,
} from '@mui/icons-material';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickStats = [
    {
      title: 'Total Revenue',
      value: '₹2,45,000',
      change: '+12.5%',
      icon: <TrendingUp />,
      color: '#3b82f6'
    },
    {
      title: 'Active Orders',
      value: '48',
      change: '+8.2%',
      icon: <ShoppingCart />,
      color: '#10b981'
    },
    {
      title: 'Pending Tasks',
      value: '12',
      change: '-3.1%',
      icon: <Assignment />,
      color: '#f59e0b'
    },
    {
      title: 'Team Members',
      value: '8',
      change: '+2',
      icon: <DashboardIcon />,
      color: '#8b5cf6'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'New payment received',
      description: 'Payment from client ABC',
      time: '2 hours ago',
      amount: '₹15,000'
    },
    {
      id: 2,
      title: 'Order completed',
      description: 'Order #123 delivered',
      time: '4 hours ago',
      amount: '₹8,500'
    },
    {
      id: 3,
      title: 'New invoice created',
      description: 'Invoice #456 for client XYZ',
      time: '6 hours ago',
      amount: '₹22,000'
    }
  ];

  const quickActions = [
    {
      title: 'Create Invoice',
      icon: <Description />,
      href: '/dashboard/payments'
    },
    {
      title: 'Add Expense',
      icon: <ReceiptLong />,
      href: '/dashboard/payments?tab=expenses'
    },
    {
      title: 'View Orders',
      icon: <ListAlt />,
      href: '/dashboard/order'
    },
    {
      title: 'Team Hub',
      icon: <Forum />,
      href: '/dashboard/teamhub'
    }
  ];

  return (
    <StandardPageLayout
      title={`${getGreeting()}, ${user?.name || 'Guest'}!`}
      description="Welcome to your AGGRANDIZE Dashboard. Here's what's happening today."
      icon={<DashboardIcon />}
    >
      {/* Database Status Indicator */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <DatabaseStatusIndicator />
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  backgroundColor: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color
                }}>
                  {stat.icon}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'success.main',
                    fontWeight: 600
                  }}
                >
                  {stat.change}
                </Typography>
              </Box>
              <Typography variant="h4" component="h3" fontWeight="700" sx={{ mb: 0.5 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600">
                Recent Activities
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              {recentActivities.map((activity) => (
                <Box
                  key={activity.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <TrendingUp sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        {activity.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2" fontWeight="600">
                      {activity.amount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600">
                Quick Actions
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={6} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => router.push(action.href)}
                      sx={{
                        height: 'auto',
                        p: 3,
                        flexDirection: 'column',
                        gap: 1,
                        textTransform: 'none'
                      }}
                    >
                      {action.icon}
                      <Typography variant="body2" fontWeight="600">
                        {action.title}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </StandardPageLayout>
  );
}
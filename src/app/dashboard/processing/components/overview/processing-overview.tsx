'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { ProcessingStats } from '@/types/processing';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Assignment as TasksIcon,
  Schedule as InProgressIcon,
  PendingActions as PendingIcon,
  CheckCircle as PublishedIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

export function ProcessingOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/processing/stats?user=${user?.name || user?.email}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
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

  if (!stats) return null;

  const statsCards = [
    {
      title: 'Total Tasks',
      value: stats.total_tasks,
      icon: <TasksIcon />,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      title: 'In Progress',
      value: stats.in_progress_count + stats.content_writing_count,
      icon: <InProgressIcon />,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)'
    },
    {
      title: 'Pending Approval',
      value: stats.pending_approval_count,
      icon: <PendingIcon />,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)'
    },
    {
      title: 'Published',
      value: stats.published_count,
      icon: <PublishedIcon />,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Payment Pending',
      value: stats.payment_requested_count,
      icon: <PaymentIcon />,
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)'
    },
    {
      title: 'Overdue Tasks',
      value: stats.overdue_count,
      icon: <WarningIcon />,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)'
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="600" gutterBottom>
        Processing Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your task statistics and progress summary
      </Typography>

      <Grid container spacing={3}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: card.bgColor,
                      color: card.color
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    sx={{ color: card.color }}
                  >
                    {card.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {stats.overdue_count > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          You have {stats.overdue_count} overdue task{stats.overdue_count > 1 ? 's' : ''}.
          Please check the My Tasks tab to prioritize them.
        </Alert>
      )}
    </Box>
  );
}

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Icon
} from '@mui/material';
import { AttachMoney, ShoppingCart, Task } from '@mui/icons-material';

// A reusable stat card component for the dashboard
const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
  <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      <Typography variant="h4" fontWeight="600">{value}</Typography>
    </Box>
    <Box sx={{ color, fontSize: '3rem' }}>
      {icon}
    </Box>
  </Paper>
);

export function WelcomeDashboard() {
  const { user } = useAuth();

  const currentUser = user || { name: 'Guest' };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Box>
      {/* Welcome Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, md: 4 }, 
          mb: 4, 
          borderRadius: 2, 
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          border: '1px solid',
          borderColor: 'primary.dark'
        }}
      >
        <Typography variant="h4" fontWeight="700">{getGreeting()}, {currentUser.name}! 👋</Typography>
        <Typography variant="subtitle1">Welcome back to your business management platform.</Typography>
      </Paper>

      {/* Key Stats Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Today's Revenue" value="₹12,500" icon={<AttachMoney fontSize="inherit" />} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="New Orders" value="32" icon={<ShoppingCart fontSize="inherit" />} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pending Tasks" value="8" icon={<Task fontSize="inherit" />} color="warning.main" />
        </Grid>
      </Grid>
    </Box>
  );
}

export default WelcomeDashboard;

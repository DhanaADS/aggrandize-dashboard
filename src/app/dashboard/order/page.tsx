'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { OrderOverview } from './components/overview/order-overview';
import { OrdersTab } from './components/orders/orders-tab';
import { OrderDetail } from './components/order-detail/order-detail';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Skeleton,
  IconButton,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Dashboard as OverviewIcon,
  ShoppingCart as OrdersIcon,
  Receipt as DetailIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

type OrderModule = 'overview' | 'orders' | 'detail';

export default function OrderPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as OrderModule;
  const orderIdParam = searchParams.get('id');

  const [activeModule, setActiveModule] = useState<OrderModule>('overview');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && ['overview', 'orders', 'detail'].includes(tabParam)) {
      setActiveModule(tabParam);
    }
    if (orderIdParam) {
      setSelectedOrderId(orderIdParam);
      setActiveModule('detail');
    }
  }, [tabParam, orderIdParam]);

  if (!user) {
    return <Skeleton variant="rectangular" width="100%" height="80vh" />;
  }

  const modules = [
    { id: 'overview' as const, label: 'Overview', icon: <OverviewIcon /> },
    { id: 'orders' as const, label: 'Orders', icon: <OrdersIcon /> },
  ];

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveModule('detail');
  };

  const handleBackToOrders = () => {
    setSelectedOrderId(null);
    setActiveModule('orders');
  };

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        {activeModule === 'detail' && selectedOrderId ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleBackToOrders} sx={{ color: 'primary.main' }}>
              <BackIcon />
            </IconButton>
            <Box>
              <Breadcrumbs sx={{ mb: 0.5 }}>
                <Link
                  component="button"
                  onClick={() => setActiveModule('orders')}
                  sx={{ cursor: 'pointer', textDecoration: 'none', color: 'text.secondary' }}
                >
                  Orders
                </Link>
                <Typography color="text.primary">Order Details</Typography>
              </Breadcrumbs>
              <Typography
                variant="h4"
                component="h1"
                fontWeight="700"
                sx={{ color: 'text.primary', letterSpacing: '-0.025em' }}
              >
                Order Details
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography
              variant="h3"
              component="h1"
              fontWeight="700"
              sx={{ color: 'text.primary', mb: 0.5, letterSpacing: '-0.025em' }}
            >
              Order Management
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.5 }}
            >
              Manage client orders, track publications, and monitor payments.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tab Navigation - Only show when not viewing detail */}
      {activeModule !== 'detail' && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={activeModule}
            onChange={(_, newValue) => setActiveModule(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Order modules"
          >
            {modules.map((module) => (
              <Tab
                key={module.id}
                value={module.id}
                icon={module.icon}
                label={module.label}
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Content Section */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
        {activeModule === 'overview' && <OrderOverview onViewOrder={handleViewOrder} />}
        {activeModule === 'orders' && <OrdersTab onViewOrder={handleViewOrder} />}
        {activeModule === 'detail' && selectedOrderId && (
          <OrderDetail orderId={selectedOrderId} onBack={handleBackToOrders} />
        )}
      </Paper>
    </Box>
  );
}

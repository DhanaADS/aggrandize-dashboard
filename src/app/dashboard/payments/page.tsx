'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { OverviewFinalDesign } from './components/overview/overview-final-design';
import { ExpensesTab } from './components/expenses/expenses-tab';
import { SalaryTab } from './components/salary/salary-tab';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Skeleton
} from '@mui/material';
import {
  AccountBalance as PaymentsIcon,
  CreditCard as ExpensesIcon,
  Group as SalaryIcon,
} from '@mui/icons-material';

type FinanceModule = 'overview' | 'expenses' | 'salary';

export default function PaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as FinanceModule;
  const [activeModule, setActiveModule] = useState<FinanceModule>('overview');

  useEffect(() => {
    if (tabParam && ['overview', 'expenses', 'salary'].includes(tabParam)) {
      setActiveModule(tabParam);
    }
  }, [tabParam]);

  if (!user) {
    return <Skeleton variant="rectangular" width="100%" height="80vh" />;
  }

  const modules = [
    { id: 'overview' as const, label: 'Overview', icon: <PaymentsIcon /> },
    { id: 'expenses' as const, label: 'Expenses', icon: <ExpensesIcon /> },
    { id: 'salary' as const, label: 'Salary', icon: <SalaryIcon /> },
  ];

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* Page Header - Formal typography style */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="700"
            sx={{
              color: 'text.primary',
              mb: 0.5,
              letterSpacing: '-0.025em'
            }}
          >
            Finance Management
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1.1rem',
              lineHeight: 1.5
            }}
          >
            Complete financial control for AGGRANDIZE Digital.
          </Typography>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={activeModule}
          onChange={(_, newValue) => {
            setActiveModule(newValue);
            router.push(`?tab=${newValue}`, { scroll: false });
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Finance modules"
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

      {/* Content Section */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
        {activeModule === 'overview' && <OverviewFinalDesign />}
        {activeModule === 'expenses' && <ExpensesTab />}
        {activeModule === 'salary' && <SalaryTab />}
      </Paper>
    </Box>
  );
}

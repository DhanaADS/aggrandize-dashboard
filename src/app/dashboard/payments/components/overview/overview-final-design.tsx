'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getUtilityBills,
  getExpenses,
  getSubscriptions,
  getTeamSettlementStatus
} from '@/lib/finance-api';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface FinancialSummary {
  settled: number;
  outstanding: number;
  netBalance: number;
  breakdown: {
    [key: string]: { settled: number; outstanding: number };
  };
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const StatCard = ({ title, value }: { title: string, value: string }) => (
  <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Typography variant="body2" color="text.secondary">{title}</Typography>
    <Typography variant="h5" fontWeight="600">{value}</Typography>
  </Paper>
);

export function OverviewFinalDesign() {
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedMonth = useMemo(() => {
    const now = new Date();
    if (selectedRange === 'Last Month') now.setMonth(now.getMonth() - 1);
    return now.toISOString().slice(0, 7);
  }, [selectedRange]);

  useEffect(() => {
    const loadFinancialSummary = async () => {
      setIsLoading(true);
      setErrors([]);

      const dateRange = {
        from: `${selectedMonth}-01`,
        to: new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).toISOString().slice(0, 10)
      };

      // Use Promise.allSettled to handle individual API failures gracefully
      const results = await Promise.allSettled([
        getMonthlySalaryOverview(selectedMonth),
        getUtilityBills({ month_from: selectedMonth, month_to: selectedMonth }),
        getExpenses({ date_from: dateRange.from, date_to: dateRange.to }),
        getSubscriptions(),
        getTeamSettlementStatus(selectedMonth)
      ]);

      const loadErrors: string[] = [];

      // Extract results or use defaults for failed promises
      const salary = results[0].status === 'fulfilled' ? results[0].value : null;
      if (results[0].status === 'rejected') {
        console.error('Salary data failed:', results[0].reason);
        loadErrors.push('Salary data unavailable');
      }

      const utility = results[1].status === 'fulfilled' ? results[1].value : [];
      if (results[1].status === 'rejected') {
        console.error('Utility bills failed:', results[1].reason);
        loadErrors.push('Utility bills unavailable');
      }

      const expenses = results[2].status === 'fulfilled' ? results[2].value : [];
      if (results[2].status === 'rejected') {
        console.error('Expenses failed:', results[2].reason);
        loadErrors.push('Expenses unavailable');
      }

      const subscriptions = results[3].status === 'fulfilled' ? results[3].value : [];
      if (results[3].status === 'rejected') {
        console.error('Subscriptions failed:', results[3].reason);
        loadErrors.push('Subscriptions unavailable');
      }

      const settlements = results[4].status === 'fulfilled' ? results[4].value : null;
      if (results[4].status === 'rejected') {
        console.error('Settlements failed:', results[4].reason);
        loadErrors.push('Settlements unavailable');
      }

      setErrors(loadErrors);

      // Build breakdown with available data (ensure all amounts are converted to numbers)
      const breakdown = {
        Salary: {
          settled: Number(salary?.total_paid_amount) || 0,
          outstanding: Number(salary?.total_pending_amount) || 0
        },
        'Utility Bills': {
          settled: utility.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (Number(b.amount_inr) || 0), 0),
          outstanding: utility.filter(b => ['pending', 'overdue'].includes(b.payment_status)).reduce((s, b) => s + (Number(b.amount_inr) || 0), 0)
        },
        Expenses: {
          settled: expenses.filter(e => e.payment_status === 'approved').reduce((s, e) => s + (Number(e.amount_inr) || 0), 0),
          outstanding: expenses.filter(e => e.payment_status !== 'approved').reduce((s, e) => s + (Number(e.amount_inr) || 0), 0)
        },
        Subscriptions: {
          settled: subscriptions.filter(s => new Date(s.due_date) >= new Date(dateRange.from) && new Date(s.due_date) <= new Date(dateRange.to) && s.is_active).reduce((s, sub) => s + (Number(sub.amount_inr) || 0), 0),
          outstanding: 0
        },
        Settlements: {
          settled: Number(settlements?.completedAmount) || 0,
          outstanding: Number(settlements?.pendingAmount) || 0
        },
      };

      const totalSettled = Object.values(breakdown).reduce((sum, item) => sum + item.settled, 0);
      const totalOutstanding = Object.values(breakdown).reduce((sum, item) => sum + item.outstanding, 0);

      setSummary({ settled: totalSettled, outstanding: totalOutstanding, netBalance: totalSettled - totalOutstanding, breakdown });
      setIsLoading(false);
    };

    loadFinancialSummary();
  }, [selectedMonth]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <ToggleButtonGroup value={selectedRange} exclusive onChange={(_, newValue) => { if (newValue) setSelectedRange(newValue); }} aria-label="Date range">
          <ToggleButton value="This Month">This Month</ToggleButton>
          <ToggleButton value="Last Month">Last Month</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" startIcon={<AddIcon />}>New Payment</Button>
      </Box>

      {errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Partial data available. Issues: {errors.join(', ')}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {isLoading ? Array.from(new Array(3)).map((_, i) => <Grid item xs={12} md={4} key={i}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} /></Grid>) : (
          <>
            <Grid item xs={12} md={4}><StatCard title="Total Settled" value={formatCurrency(summary?.settled || 0)} /></Grid>
            <Grid item xs={12} md={4}><StatCard title="Total Outstanding" value={formatCurrency(summary?.outstanding || 0)} /></Grid>
            <Grid item xs={12} md={4}><StatCard title="Net Balance" value={formatCurrency(summary?.netBalance || 0)} /></Grid>
          </>
        )}
      </Grid>

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.focus' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Settled</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Outstanding</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from(new Array(5)).map((_, i) => <TableRow key={i}>{Array.from(new Array(3)).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>) :
                summary && Object.entries(summary.breakdown).map(([category, amounts]) => (
                  <TableRow key={category} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell component="th" scope="row"><Typography variant="body2" fontWeight="500">{category}</Typography></TableCell>
                    <TableCell align="right">{formatCurrency(amounts.settled)}</TableCell>
                    <TableCell align="right">{formatCurrency(amounts.outstanding)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  const selectedMonth = useMemo(() => {
    const now = new Date();
    if (selectedRange === 'Last Month') now.setMonth(now.getMonth() - 1);
    return now.toISOString().slice(0, 7);
  }, [selectedRange]);

  useEffect(() => {
    const loadFinancialSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateRange = { from: `${selectedMonth}-01`, to: new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).toISOString().slice(0, 10) };
        const [salary, utility, expenses, subscriptions, settlements] = await Promise.all([
          getMonthlySalaryOverview(selectedMonth),
          getUtilityBills({ month_from: selectedMonth, month_to: selectedMonth }),
          getExpenses({ date_from: dateRange.from, date_to: dateRange.to }),
          getSubscriptions(),
          getTeamSettlementStatus(selectedMonth)
        ]);

        const breakdown = {
          Salary: { settled: salary.total_paid_amount, outstanding: salary.total_pending_amount },
          'Utility Bills': { settled: utility.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.amount_usd || 0), 0), outstanding: utility.filter(b => ['pending', 'overdue'].includes(b.payment_status)).reduce((s, b) => s + (b.amount_usd || 0), 0) },
          Expenses: { settled: expenses.filter(e => e.payment_status === 'approved').reduce((s, e) => s + (e.amount_usd || 0), 0), outstanding: expenses.filter(e => e.payment_status !== 'approved').reduce((s, e) => s + (e.amount_usd || 0), 0) },
          Subscriptions: { settled: subscriptions.filter(s => new Date(s.due_date) >= new Date(dateRange.from) && new Date(s.due_date) <= new Date(dateRange.to) && s.is_active).reduce((s, sub) => s + sub.amount_usd, 0), outstanding: 0 },
          Settlements: { settled: settlements.completedAmount, outstanding: settlements.pendingAmount },
        };

        const totalSettled = Object.values(breakdown).reduce((sum, item) => sum + item.settled, 0);
        const totalOutstanding = Object.values(breakdown).reduce((sum, item) => sum + item.outstanding, 0);

        setSummary({ settled: totalSettled, outstanding: totalOutstanding, netBalance: totalSettled - totalOutstanding, breakdown });
      } catch (err) {
        console.error(err);
        setError('Failed to load financial data. Some APIs may be down.');
      } finally {
        setIsLoading(false);
      }
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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

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
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MonthlySalaryOverview, EmployeePaymentStatus } from '@/types/finance';
import { getMonthlySalaryOverview, updatePaymentStatus, getCurrentMonth, formatMonthDisplay } from '@/lib/salary-payments-api';
import { MonthlyReport } from './monthly-report';
import { PayslipDownload } from './payslip-download';
import { MonthNavigator } from './month-navigator';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Assessment, PictureAsPdf } from '@mui/icons-material';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const StatCard = ({ title, value, subValue }: { title: string, value: React.ReactNode, subValue?: string }) => (
  <Paper elevation={3} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Typography variant="body2" color="text.secondary">{title}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="h5" fontWeight="600">{value}</Typography>
      {subValue && <Typography variant="caption" color="text.secondary">{subValue}</Typography>}
    </Box>
  </Paper>
);

export function SalaryTab() {
  const [viewMode, setViewMode] = useState<'overview' | 'monthly-report' | 'payslip-download'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [salaryOverview, setSalaryOverview] = useState<MonthlySalaryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const isEditable = selectedMonth === getCurrentMonth();

  const loadSalaryOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMonthlySalaryOverview(selectedMonth);
      setSalaryOverview(data);
    } catch (error) {
      console.error('Error loading salary overview:', error);
      setMessage('Failed to load salary data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { loadSalaryOverview(); }, [loadSalaryOverview]);

  const handlePaymentStatusChange = async (employeeId: string, newStatus: 'paid' | 'not_paid') => {
    setIsUpdating(employeeId);
    try {
      await updatePaymentStatus(employeeId, selectedMonth, newStatus);
      await loadSalaryOverview(); // Reload data to ensure consistency
      setMessage(`Status updated for employee ${employeeId}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setMessage('Failed to update status.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (viewMode === 'monthly-report') return <MonthlyReport onClose={() => setViewMode('overview')} />;
  if (viewMode === 'payslip-download') return <PayslipDownload onClose={() => setViewMode('overview')} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <MonthNavigator selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Assessment />} onClick={() => setViewMode('monthly-report')}>Monthly Report</Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={() => setViewMode('payslip-download')}>Download Payslips</Button>
        </Box>
      </Box>

      {message && <Alert severity={message.includes('Failed') ? 'error' : 'success'} sx={{ mb: 3 }}>{message}</Alert>}

      {isLoading ? <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 4 }} /> : salaryOverview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}><StatCard title="Total Employees" value={salaryOverview.total_employees} /></Grid>
          <Grid item xs={6} md={3}><StatCard title="Paid Salaries" value={salaryOverview.total_paid} subValue={formatCurrency(salaryOverview.total_paid_amount)} /></Grid>
          <Grid item xs={6} md={3}><StatCard title="Pending Salaries" value={salaryOverview.total_pending} subValue={formatCurrency(salaryOverview.total_pending_amount)} /></Grid>
          <Grid item xs={6} md={3}><StatCard title="Total Payroll" value={formatCurrency(salaryOverview.total_salary_amount)} /></Grid>
        </Grid>
      )}

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.focus' }}>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell align="right">Salary</TableCell>
                <TableCell>Payment Date</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from(new Array(5)).map((_, i) => <TableRow key={i}>{Array.from(new Array(5)).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>) : 
                !salaryOverview || salaryOverview.employees.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">No employee salary data for {formatMonthDisplay(selectedMonth)}.</TableCell></TableRow>
                ) : salaryOverview.employees.map((emp) => (
                  <TableRow key={emp.employee.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell><Typography variant="subtitle2" fontWeight="600">{emp.employee.full_name}</Typography></TableCell>
                    <TableCell>{emp.employee.designation || 'N/A'}</TableCell>
                    <TableCell align="right">{formatCurrency(emp.employee.monthly_salary_inr || 0)}</TableCell>
                    <TableCell>{emp.payment_date ? new Date(emp.payment_date).toLocaleDateString('en-GB') : '-'}</TableCell>
                    <TableCell align="center">
                      {isEditable ? (
                        <Select
                          size="small"
                          value={emp.payment_status}
                          onChange={(e) => handlePaymentStatusChange(emp.employee.id, e.target.value as 'paid' | 'not_paid')}
                          disabled={isUpdating === emp.employee.id}
                          sx={{ fontSize: '0.875rem', fontWeight: 500, borderRadius: 20, '.MuiOutlinedInput-notchedOutline': { borderWidth: 0 }, backgroundColor: emp.payment_status === 'paid' ? 'success.light' : 'warning.light', color: emp.payment_status === 'paid' ? 'success.dark' : 'warning.dark' }}
                        >
                          <MenuItem value="not_paid">Not Paid</MenuItem>
                          <MenuItem value="paid">Paid</MenuItem>
                        </Select>
                      ) : (
                        <Chip label={emp.payment_status} size="small" color={emp.payment_status === 'paid' ? 'success' : 'warning'} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

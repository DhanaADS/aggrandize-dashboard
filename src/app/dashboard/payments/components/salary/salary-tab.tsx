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
  Checkbox
} from '@mui/material';
import { Assessment, PictureAsPdf, CheckCircle } from '@mui/icons-material';
import { PaymentStatusBadge } from './payment-status-badge';
import { PaymentConfirmationDialog } from './payment-confirmation-dialog';

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

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<{
    id: string;
    name: string;
    salary: number;
  } | null>(null);

  // Bulk selection state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

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
      await loadSalaryOverview();
      setMessage(`Payment status updated successfully`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setMessage('Failed to update status.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Computed values for bulk selection
  const notPaidEmployees = salaryOverview?.employees.filter(e => e.payment_status === 'not_paid') || [];
  const allNotPaidSelected = notPaidEmployees.length > 0 &&
    notPaidEmployees.every(e => selectedEmployees.includes(e.employee.id));
  const someSelected = selectedEmployees.length > 0;
  const allPaid = notPaidEmployees.length === 0;

  // Handle status badge click (individual)
  const handleStatusClick = (emp: EmployeePaymentStatus) => {
    if (emp.payment_status === 'not_paid') {
      // Show confirmation dialog before marking as paid
      setPendingEmployee({
        id: emp.employee.id,
        name: emp.employee.full_name,
        salary: Number(emp.employee.monthly_salary_inr) || 0,
      });
      setConfirmDialogOpen(true);
    } else {
      // Revert to not_paid - no confirmation needed
      handlePaymentStatusChange(emp.employee.id, 'not_paid');
    }
  };

  // Confirm individual payment
  const handleConfirmPayment = async () => {
    if (pendingEmployee) {
      await handlePaymentStatusChange(pendingEmployee.id, 'paid');
      setConfirmDialogOpen(false);
      setPendingEmployee(null);
    }
  };

  // Cancel confirmation dialog
  const handleCancelConfirmation = () => {
    setConfirmDialogOpen(false);
    setPendingEmployee(null);
  };

  // Select all not-paid employees
  const handleSelectAll = () => {
    if (allNotPaidSelected) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(notPaidEmployees.map(e => e.employee.id));
    }
  };

  // Toggle individual employee selection
  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Bulk mark as paid
  const handleBulkMarkAsPaid = async () => {
    if (selectedEmployees.length === 0) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(
        selectedEmployees.map(id => updatePaymentStatus(id, selectedMonth, 'paid'))
      );
      const count = selectedEmployees.length;
      setSelectedEmployees([]);
      await loadSalaryOverview();
      setMessage(`${count} salaries marked as paid`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error bulk updating:', error);
      setMessage('Failed to update some payments');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Clear selection when month changes
  useEffect(() => {
    setSelectedEmployees([]);
  }, [selectedMonth]);

  if (viewMode === 'monthly-report') return <MonthlyReport onClose={() => setViewMode('overview')} />;
  if (viewMode === 'payslip-download') return <PayslipDownload onClose={() => setViewMode('overview')} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} isEditable={isEditable} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isEditable && selectedEmployees.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={isBulkUpdating ? null : <CheckCircle />}
              onClick={handleBulkMarkAsPaid}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? 'Processing...' : `Mark ${selectedEmployees.length} as Paid`}
            </Button>
          )}
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
                {isEditable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allNotPaidSelected}
                      indeterminate={someSelected && !allNotPaidSelected}
                      onChange={handleSelectAll}
                      disabled={allPaid || isBulkUpdating}
                      sx={{ color: 'text.secondary' }}
                    />
                  </TableCell>
                )}
                <TableCell>Employee</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell align="right">Salary</TableCell>
                <TableCell>Payment Date</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from(new Array(5)).map((_, i) => (
                <TableRow key={i}>
                  {isEditable && <TableCell padding="checkbox"><Skeleton variant="rectangular" width={24} height={24} /></TableCell>}
                  {Array.from(new Array(5)).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              )) :
                !salaryOverview || salaryOverview.employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 6 : 5} align="center">
                      No employee salary data for {formatMonthDisplay(selectedMonth)}.
                    </TableCell>
                  </TableRow>
                ) : salaryOverview.employees.map((emp) => {
                  const isNotPaid = emp.payment_status === 'not_paid';
                  const isSelected = selectedEmployees.includes(emp.employee.id);

                  return (
                    <TableRow
                      key={emp.employee.id}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: isSelected ? 'action.selected' : 'inherit'
                      }}
                    >
                      {isEditable && (
                        <TableCell padding="checkbox">
                          {isNotPaid ? (
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectEmployee(emp.employee.id)}
                              disabled={isBulkUpdating}
                            />
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="600">
                          {emp.employee.full_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{emp.employee.designation || 'N/A'}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(emp.employee.monthly_salary_inr) || 0)}
                      </TableCell>
                      <TableCell>
                        {emp.payment_date ? new Date(emp.payment_date).toLocaleDateString('en-GB') : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <PaymentStatusBadge
                          status={emp.payment_status}
                          isEditable={isEditable}
                          isUpdating={isUpdating === emp.employee.id}
                          onClick={() => handleStatusClick(emp)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmPayment}
        employeeName={pendingEmployee?.name || ''}
        salaryAmount={pendingEmployee?.salary || 0}
        isLoading={isUpdating !== null}
      />
    </Box>
  );
}

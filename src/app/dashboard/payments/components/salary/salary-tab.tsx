'use client';

import { useState, useEffect } from 'react';
import { MonthlySalaryOverview, EmployeePaymentStatus } from '@/types/finance';
import { getMonthlySalaryOverview, updatePaymentStatus, getCurrentMonth, formatMonthDisplay, formatCurrency } from '@/lib/salary-payments-api';
import { MonthlyReport } from './monthly-report';
import { PayslipDownload } from './payslip-download';
import { MonthNavigator } from './month-navigator';
import styles from '../../payments.module.css';

type ViewMode = 'overview' | 'monthly-report' | 'payslip-download';

export function SalaryTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [salaryOverview, setSalaryOverview] = useState<MonthlySalaryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Track which employee is being updated
  const [message, setMessage] = useState('');

  // Determine if current month is editable
  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const isEditable = isCurrentMonth;

  useEffect(() => {
    loadSalaryOverview();
  }, [selectedMonth]);

  const loadSalaryOverview = async () => {
    try {
      setIsLoading(true);
      const data = await getMonthlySalaryOverview(selectedMonth);
      setSalaryOverview(data);
    } catch (error) {
      console.error('Error loading salary overview:', error);
      setMessage('Failed to load salary data. Please ensure you have admin access.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentStatusChange = async (employeeId: string, newStatus: 'paid' | 'not_paid') => {
    try {
      setIsUpdating(employeeId);
      await updatePaymentStatus(employeeId, selectedMonth, newStatus);
      
      // Update the local state
      if (salaryOverview) {
        const updatedEmployees = salaryOverview.employees.map(emp => 
          emp.employee.id === employeeId 
            ? { ...emp, payment_status: newStatus, payment_date: newStatus === 'paid' ? new Date().toISOString() : undefined }
            : emp
        );
        
        // Recalculate totals
        const totalPaid = updatedEmployees.filter(emp => emp.payment_status === 'paid').length;
        const totalPending = updatedEmployees.length - totalPaid;
        const totalPaidAmount = updatedEmployees
          .filter(emp => emp.payment_status === 'paid')
          .reduce((sum, emp) => sum + (emp.employee.monthly_salary_inr || 0), 0);
        const totalPendingAmount = salaryOverview.total_salary_amount - totalPaidAmount;

        setSalaryOverview({
          ...salaryOverview,
          employees: updatedEmployees,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_paid_amount: totalPaidAmount,
          total_pending_amount: totalPendingAmount
        });
      }

      setMessage(`Payment status updated successfully for ${newStatus === 'paid' ? 'PAID' : 'NOT PAID'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setMessage('Failed to update payment status');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Render different views based on viewMode
  if (viewMode === 'monthly-report') {
    return <MonthlyReport onClose={() => handleViewModeChange('overview')} />;
  }

  if (viewMode === 'payslip-download') {
    return <PayslipDownload onClose={() => handleViewModeChange('overview')} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '1.5rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0'
          }}>
            💼 Salary Management - {formatMonthDisplay(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0',
              fontSize: '0.95rem'
            }}>
              Track monthly salary payments and generate reports
            </p>
            {!isEditable && (
              <span style={{
                background: 'rgba(255, 193, 7, 0.2)',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                color: '#ffc107',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                🔒 Read Only - Previous Month
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <MonthNavigator
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            isEditable={isEditable}
          />
          <button 
            className={styles.buttonSecondary}
            onClick={() => handleViewModeChange('monthly-report')}
            style={{ fontSize: '0.9rem' }}
          >
            📊 Monthly Report
          </button>
          <button 
            className={styles.buttonSecondary}
            onClick={() => handleViewModeChange('payslip-download')}
            style={{ fontSize: '0.9rem' }}
          >
            📄 Download Payslip
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`${styles.message} ${message.includes('Failed') || message.includes('Error') ? styles.error : styles.success}`} style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          Loading salary data...
        </div>
      )}

      {/* Salary Overview */}
      {!isLoading && salaryOverview && (
        <div>
          {/* Summary Cards */}
          <div className={styles.grid} style={{ marginBottom: '2rem' }}>
            <div className={styles.card}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
              <div style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {salaryOverview.total_employees}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Total Employees
              </div>
            </div>
            
            <div className={styles.card}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {salaryOverview.total_paid}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Paid ({formatCurrency(salaryOverview.total_paid_amount)})
              </div>
            </div>
            
            <div className={styles.card}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {salaryOverview.total_pending}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Pending ({formatCurrency(salaryOverview.total_pending_amount)})
              </div>
            </div>
            
            <div className={styles.card}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
              <div style={{ color: '#8b5cf6', fontSize: '1.25rem', fontWeight: 'bold' }}>
                {formatCurrency(salaryOverview.total_salary_amount)}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Total Monthly Salary
              </div>
            </div>
          </div>

          {/* Employee Salary Table */}
          <div className={styles.card}>
            <h3 style={{ 
              color: '#ffffff', 
              fontSize: '1.1rem', 
              fontWeight: '600',
              margin: '0 0 1.5rem 0'
            }}>
              Employee Salary Status - {formatMonthDisplay(selectedMonth)}
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '1rem', textAlign: 'left', fontSize: '0.9rem' }}>
                      Employee Name
                    </th>
                    <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '1rem', textAlign: 'left', fontSize: '0.9rem' }}>
                      Employee No
                    </th>
                    <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                      Monthly Salary
                    </th>
                    <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      Payment Status
                    </th>
                    <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salaryOverview.employees.map((empPayment) => (
                    <tr key={empPayment.employee.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ color: '#ffffff', padding: '1rem', fontSize: '0.95rem', fontWeight: '500' }}>
                        <div>
                          <div>{empPayment.employee.full_name}</div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                            {empPayment.employee.designation || 'No designation'}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '1rem', fontSize: '0.9rem' }}>
                        {empPayment.employee.employee_no || 'Not Set'}
                      </td>
                      <td style={{ color: '#00ff88', padding: '1rem', fontSize: '0.95rem', fontWeight: '600', textAlign: 'right' }}>
                        {formatCurrency(empPayment.employee.monthly_salary_inr || 0)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {isEditable ? (
                          <select
                            value={empPayment.payment_status}
                            onChange={(e) => handlePaymentStatusChange(empPayment.employee.id, e.target.value as 'paid' | 'not_paid')}
                            disabled={isUpdating === empPayment.employee.id}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              backgroundColor: empPayment.payment_status === 'paid' ? '#10b981' : '#ef4444',
                              color: 'white'
                            }}
                          >
                            <option value="not_paid" style={{ backgroundColor: '#ef4444' }}>Not Paid</option>
                            <option value="paid" style={{ backgroundColor: '#10b981' }}>Paid</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            backgroundColor: empPayment.payment_status === 'paid' ? '#10b981' : '#ef4444',
                            color: 'white',
                            display: 'inline-block'
                          }}>
                            {empPayment.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                        {empPayment.payment_date 
                          ? new Date(empPayment.payment_date).toLocaleDateString('en-IN')
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Total */}
          <div style={{ 
            marginTop: '2rem',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h4 style={{ 
              color: '#ffffff', 
              fontSize: '1.1rem', 
              fontWeight: '600',
              margin: '0 0 1rem 0',
              textAlign: 'center'
            }}>
              📊 Monthly Summary - {formatMonthDisplay(selectedMonth)}
            </h4>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  Total Salary Budget
                </div>
                <div style={{ color: '#8b5cf6', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {formatCurrency(salaryOverview.total_salary_amount)}
                </div>
              </div>
              
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  Amount Paid
                </div>
                <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {formatCurrency(salaryOverview.total_paid_amount)}
                </div>
              </div>
              
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  Amount Pending
                </div>
                <div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {formatCurrency(salaryOverview.total_pending_amount)}
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '1rem', 
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem'
            }}>
              Payment Date: <span style={{ fontWeight: '600' }}>1st of Every Month</span>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && (!salaryOverview || salaryOverview.employees.length === 0) && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '3rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Employees Found</div>
          <div style={{ fontSize: '0.9rem' }}>
            Please add employee details in the Admin Dashboard first.
          </div>
        </div>
      )}
    </div>
  );
}
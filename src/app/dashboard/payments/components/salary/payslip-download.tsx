'use client';

import { useState, useEffect } from 'react';
import { getEmployeeProfiles } from '@/lib/employees-api-client';
import { PayslipData, EmployeeProfile } from '@/types/finance';
import { downloadPayslipPDF } from '@/lib/payslip-pdf';
import styles from '../../payments.module.css';

interface PayslipDownloadProps {
  onClose: () => void;
}

export function PayslipDownload({ onClose }: PayslipDownloadProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const employeeData = await getEmployeeProfiles();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeByName = (name: string): EmployeeProfile | undefined => {
    return employees.find(emp => emp.name === name);
  };

  const generatePayslipData = (employee: EmployeeProfile, month: string): PayslipData => {
    const [year, monthNum] = month.split('-');
    const totalDays = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const workedDays = totalDays; // Assuming full month worked
    
    return {
      employee,
      salary_month: month,
      basic_salary: employee.monthly_salary_inr,
      total_earnings: employee.monthly_salary_inr,
      total_deductions: 0, // No deductions as specified
      net_pay: employee.monthly_salary_inr,
      worked_days: workedDays,
      total_days: totalDays,
      generated_date: new Date().toISOString(),
    };
  };

  const handleDownloadPayslip = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    const employee = getEmployeeByName(selectedEmployee);
    if (!employee) {
      alert('Employee not found');
      return;
    }

    try {
      setIsGenerating(true);
      const payslipData = generatePayslipData(employee, selectedMonth);
      await downloadPayslipPDF(payslipData);
    } catch (error) {
      console.error('Error generating payslip:', error);
      alert('Failed to generate payslip');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPayslip = () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    const employee = getEmployeeByName(selectedEmployee);
    if (!employee) {
      alert('Employee not found');
      return;
    }

    // Show preview data
    const payslipData = generatePayslipData(employee, selectedMonth);
    console.log('Payslip Preview:', payslipData);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const selectedEmployeeData = selectedEmployee ? getEmployeeByName(selectedEmployee) : null;

  return (
    <div className={styles.card}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '1.2rem', 
          fontWeight: '600',
          margin: '0'
        }}>
          📄 Download Employee Payslip
        </h3>
        <button
          onClick={onClose}
          className={styles.buttonSecondary}
          style={{ fontSize: '0.9rem' }}
        >
          ✕ Close
        </button>
      </div>

      {/* Selection Form */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'grid', 
          gap: '1.5rem', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          marginBottom: '1.5rem'
        }}>
          {/* Employee Selection */}
          <div>
            <label className={styles.label} style={{ marginBottom: '0.5rem' }}>
              Select Employee *
            </label>
            <select
              className={styles.select}
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              disabled={isLoading}
            >
              <option value="">
                {isLoading ? 'Loading employees...' : 'Choose an employee...'}
              </option>
              {employees.map(employee => (
                <option key={employee.employee_no} value={employee.name}>
                  {employee.name} ({employee.employee_no})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selection */}
          <div>
            <label className={styles.label} style={{ marginBottom: '0.5rem' }}>
              Select Month *
            </label>
            <input
              type="month"
              className={styles.input}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleDownloadPayslip}
            disabled={!selectedEmployee || isGenerating}
            className={styles.button}
            style={{ 
              fontSize: '0.95rem',
              padding: '0.75rem 1.5rem'
            }}
          >
            {isGenerating ? 'Generating...' : '📄 Download Payslip PDF'}
          </button>
        </div>
      </div>

      {/* Employee Details Preview */}
      {selectedEmployeeData && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ 
            color: '#ffffff', 
            fontSize: '1.1rem', 
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Employee Details Preview
          </h4>

          <div style={{ 
            display: 'grid', 
            gap: '1rem', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
          }}>
            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Employee Name
              </div>
              <div style={{ color: '#ffffff', fontWeight: '500' }}>
                {selectedEmployeeData.name}
              </div>
            </div>

            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Employee Number
              </div>
              <div style={{ color: '#ffffff', fontWeight: '500' }}>
                {selectedEmployeeData.employee_no}
              </div>
            </div>

            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Designation
              </div>
              <div style={{ color: '#ffffff', fontWeight: '500' }}>
                {selectedEmployeeData.designation}
              </div>
            </div>

            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Monthly Salary
              </div>
              <div style={{ color: '#00ff88', fontWeight: '600', fontSize: '1.1rem' }}>
                {formatCurrency(selectedEmployeeData.monthly_salary_inr)}
              </div>
            </div>

            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Bank Account
              </div>
              <div style={{ color: '#ffffff', fontWeight: '500' }}>
                {selectedEmployeeData.bank_account || 'Not provided'}
              </div>
            </div>

            <div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Bank Name
              </div>
              <div style={{ color: '#ffffff', fontWeight: '500' }}>
                {selectedEmployeeData.bank_name || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Preview */}
      {selectedEmployeeData && (
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h4 style={{ 
            color: '#3b82f6', 
            fontSize: '1.1rem', 
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Payslip Summary - {formatMonth(selectedMonth)}
          </h4>

          <div style={{ 
            display: 'grid', 
            gap: '1rem', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Basic Salary
              </div>
              <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {formatCurrency(selectedEmployeeData.monthly_salary_inr)}
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Total Deductions
              </div>
              <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold' }}>
                ₹0.00
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Net Pay
              </div>
              <div style={{ color: '#00ff88', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {formatCurrency(selectedEmployeeData.monthly_salary_inr)}
              </div>
            </div>
          </div>

          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', textAlign: 'center' }}>
            This payslip will include company letterhead, employee details, salary breakdown, and signatures
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1.5rem'
      }}>
        <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '0.5rem' }}>
          📋 Instructions:
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          • Select an employee from the dropdown list<br/>
          • Choose the month and year for which you want to generate the payslip<br/>
          • Click "Download Payslip PDF" to generate and download the official payslip<br/>
          • The payslip will be downloaded in PDF format matching the ADS template<br/>
          • All salary payments are scheduled for the 1st of every month
        </div>
      </div>
    </div>
  );
}
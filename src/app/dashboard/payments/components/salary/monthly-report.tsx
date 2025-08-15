'use client';

import { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { getEmployeeProfiles } from '@/lib/employees-api-client';
import { MonthlyReport, EmployeeProfile } from '@/types/finance';
import styles from '../../payments.module.css';

interface MonthlyReportProps {
  onClose: () => void;
}

// PDF Styles for Monthly Report
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 10,
    textAlign: 'center',
    color: '#333',
    lineHeight: 1.4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    textDecoration: 'underline',
    color: '#000',
  },
  table: {
    marginBottom: 20,
    border: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #000',
    padding: 10,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    minHeight: 30,
    alignItems: 'center',
    padding: 8,
  },
  tableCell: {
    fontSize: 11,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderTop: '2px solid #000',
    padding: 12,
    fontWeight: 'bold',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    border: '1px solid #000',
    backgroundColor: '#f9f9f9',
  },
  summaryText: {
    fontSize: 12,
    marginBottom: 5,
    color: '#000',
  }
});

// PDF Document Component
const MonthlyReportDocument: React.FC<{ data: MonthlyReport }> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.companyName}>ADS</Text>
          <Text style={pdfStyles.companyDetails}>
            AGGRANDIZE DIGITAL SOLUTIONS{'\n'}
            No.2/126A, Koil Street, Semmandapatti Village,{'\n'}
            Namakkal Taluk, Namakkal District - 637003{'\n'}
            Email: connect@aggrandizedigital.com
          </Text>
        </View>

        {/* Report Title */}
        <Text style={pdfStyles.reportTitle}>
          MONTHLY SALARY REPORT - {formatMonth(data.month).toUpperCase()}
        </Text>

        {/* Salary Table */}
        <View style={pdfStyles.table}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.tableHeaderCell, { width: '5%' }]}>S.No</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>Employee Name</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '20%' }]}>Employee No</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>Designation</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Salary (₹)</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>Status</Text>
          </View>

          {/* Employee Rows */}
          {data.employees.map((emp, index) => (
            <View key={emp.employee.employee_no} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.tableCell, { width: '5%' }]}>{index + 1}</Text>
              <Text style={[pdfStyles.tableCell, { width: '25%' }]}>{emp.employee.name}</Text>
              <Text style={[pdfStyles.tableCell, { width: '20%' }]}>{emp.employee.employee_no}</Text>
              <Text style={[pdfStyles.tableCell, { width: '25%' }]}>{emp.employee.designation}</Text>
              <Text style={[pdfStyles.tableCell, { width: '15%', textAlign: 'right' }]}>
                {emp.salary_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[pdfStyles.tableCell, { width: '10%', textTransform: 'capitalize' }]}>{emp.payment_status}</Text>
            </View>
          ))}

          {/* Total Row */}
          <View style={[pdfStyles.tableRow, pdfStyles.totalRow]}>
            <Text style={[pdfStyles.tableCell, { width: '75%', fontWeight: 'bold' }]}>TOTAL SALARY EXPENSE</Text>
            <Text style={[pdfStyles.tableCell, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>
              {data.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={[pdfStyles.tableCell, { width: '10%' }]}></Text>
          </View>
        </View>

        {/* Summary */}
        <View style={pdfStyles.summary}>
          <Text style={[pdfStyles.summaryText, { fontWeight: 'bold', fontSize: 14 }]}>SUMMARY</Text>
          <Text style={pdfStyles.summaryText}>Total Employees: {data.employees.length}</Text>
          <Text style={pdfStyles.summaryText}>Total Monthly Salary: {formatCurrency(data.total_amount)}</Text>
          <Text style={pdfStyles.summaryText}>Report Generated: {new Date(data.generated_date).toLocaleDateString('en-IN')}</Text>
          <Text style={pdfStyles.summaryText}>Payment Date: 1st of Every Month</Text>
        </View>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 30, right: 30 }}>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Generated by Aggrandize Digital Solutions
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export function MonthlyReport({ onClose }: MonthlyReportProps) {
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

  const getCurrentMonthData = (): MonthlyReport => {
    return {
      month: selectedMonth,
      employees: employees.map(employee => ({
        employee,
        salary_amount: employee.monthly_salary_inr,
        payment_status: 'pending',
        payment_date: undefined
      })),
      total_amount: employees.reduce((total, emp) => total + emp.monthly_salary_inr, 0),
      generated_date: new Date().toISOString()
    };
  };

  const handleDownloadReport = async () => {
    try {
      setIsGenerating(true);
      const reportData = getCurrentMonthData();
      const doc = <MonthlyReportDocument data={reportData} />;
      const asPdf = pdf(doc);
      const pdfBlob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly_salary_report_${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate monthly report');
    } finally {
      setIsGenerating(false);
    }
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

  const reportData = getCurrentMonthData();

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
          📊 Monthly Salary Report
        </h3>
        <button
          onClick={onClose}
          className={styles.buttonSecondary}
          style={{ fontSize: '0.9rem' }}
        >
          ✕ Close
        </button>
      </div>

      {/* Month Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <label className={styles.label} style={{ marginBottom: '0.5rem' }}>
          Select Report Month
        </label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="month"
            className={styles.input}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '200px' }}
          />
          <button
            onClick={handleDownloadReport}
            disabled={isGenerating}
            className={styles.button}
            style={{ fontSize: '0.9rem' }}
          >
            {isGenerating ? 'Generating...' : '📄 Download PDF Report'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          Loading employee data...
        </div>
      )}

      {/* Report Preview */}
      {!isLoading && employees.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ 
            color: '#ffffff', 
            fontSize: '1.1rem', 
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Report Preview - {formatMonth(selectedMonth)}
          </h4>

        {/* Summary Cards */}
        <div className={styles.grid} style={{ marginBottom: '2rem' }}>
          <div className={styles.card}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {reportData.employees.length}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              Total Employees
            </div>
          </div>
          
          <div className={styles.card}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <div style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 'bold' }}>
              {formatCurrency(reportData.total_amount)}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              Total Monthly Salary
            </div>
          </div>
          
          <div className={styles.card}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
            <div style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 'bold' }}>
              1st
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              Payment Date (Every Month)
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>S.No</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Employee Name</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Employee No</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Designation</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>Salary Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.employees.map((emp, index) => (
                <tr key={emp.employee.employee_no} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {index + 1}
                  </td>
                  <td style={{ color: '#ffffff', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>
                    {emp.employee.name}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {emp.employee.employee_no}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {emp.employee.designation}
                  </td>
                  <td style={{ color: '#00ff88', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500', textAlign: 'right' }}>
                    {formatCurrency(emp.salary_amount)}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <td colSpan={4} style={{ color: '#ffffff', padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
                  TOTAL MONTHLY SALARY EXPENSE
                </td>
                <td style={{ color: '#00ff88', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', textAlign: 'right' }}>
                  {formatCurrency(reportData.total_amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem'
        }}>
          <div style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '0.5rem' }}>
            📋 Report Information:
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            • This report shows all employees and their monthly salary amounts<br/>
            • Salary payment date is 1st of every month<br/>
            • All amounts are in INR (Indian Rupees)<br/>
            • Click "Download PDF Report" to generate and save the official report
          </div>
        </div>
      </div>
      )}

      {/* No Employees State */}
      {!isLoading && employees.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          No employees found. Please add employee details in the Admin Dashboard first.
        </div>
      )}
    </div>
  );
}
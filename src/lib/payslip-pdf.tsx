'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { PayslipData } from '@/types/finance';

// ADS Payslip PDF Template - Exact replica of the template you shared
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  companyDetails: {
    fontSize: 10,
    textAlign: 'center',
    color: '#333',
    lineHeight: 1.4,
  },
  payslipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    textDecoration: 'underline',
    color: '#000',
  },
  employeeSection: {
    marginBottom: 15,
  },
  employeeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  employeeLabel: {
    width: '25%',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  employeeValue: {
    width: '25%',
    fontSize: 10,
    color: '#333',
  },
  salaryTable: {
    marginBottom: 20,
    border: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #000',
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    minHeight: 25,
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    padding: 5,
    color: '#333',
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 10,
    textAlign: 'left',
    padding: 5,
    color: '#333',
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
    padding: 5,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderTop: '2px solid #000',
    padding: 8,
    fontWeight: 'bold',
  },
  netPaySection: {
    marginVertical: 15,
    padding: 10,
    border: '2px solid #000',
    backgroundColor: '#f9f9f9',
  },
  netPayText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  netPayAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureSection: {
    width: '45%',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  signatureLine: {
    borderTop: '1px solid #000',
    width: '80%',
    marginTop: 30,
  },
});

const PayslipDocument: React.FC<{ data: PayslipData }> = ({ data }) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>ADS</Text>
          <Text style={styles.companyDetails}>
            AGGRANDIZE DIGITAL SOLUTIONS{'\n'}
            No.2/126A, Koil Street, Semmandapatti Village,{'\n'}
            Namakkal Taluk, Namakkal District - 637003{'\n'}
            Email: connect@aggrandizedigital.com
          </Text>
        </View>

        {/* Payslip Title */}
        <Text style={styles.payslipTitle}>PAYSLIP FOR {formatMonth(data.salary_month).toUpperCase()}</Text>

        {/* Employee Details */}
        <View style={styles.employeeSection}>
          <View style={styles.employeeRow}>
            <Text style={styles.employeeLabel}>Employee Name:</Text>
            <Text style={styles.employeeValue}>{data.employee.name}</Text>
            <Text style={styles.employeeLabel}>Employee No:</Text>
            <Text style={styles.employeeValue}>{data.employee.employee_no}</Text>
          </View>
          <View style={styles.employeeRow}>
            <Text style={styles.employeeLabel}>Designation:</Text>
            <Text style={styles.employeeValue}>{data.employee.designation}</Text>
            <Text style={styles.employeeLabel}>Worked Days:</Text>
            <Text style={styles.employeeValue}>{data.worked_days}/{data.total_days}</Text>
          </View>
          <View style={styles.employeeRow}>
            <Text style={styles.employeeLabel}>PAN No:</Text>
            <Text style={styles.employeeValue}>{data.employee.pan_no || 'N/A'}</Text>
            <Text style={styles.employeeLabel}>Bank A/c:</Text>
            <Text style={styles.employeeValue}>{data.employee.bank_account || 'N/A'}</Text>
          </View>
        </View>

        {/* Salary Table */}
        <View style={styles.salaryTable}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>EARNINGS</Text>
            <Text style={styles.tableHeaderCell}>AMOUNT (₹)</Text>
            <Text style={styles.tableHeaderCell}>DEDUCTIONS</Text>
            <Text style={styles.tableHeaderCell}>AMOUNT (₹)</Text>
          </View>

          {/* Basic Salary Row */}
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLeft}>Basic Salary</Text>
            <Text style={styles.tableCellRight}>{data.basic_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.tableCellLeft}>-</Text>
            <Text style={styles.tableCellRight}>0.00</Text>
          </View>

          {/* Add empty rows for spacing */}
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
            <Text style={styles.tableCellLeft}></Text>
            <Text style={styles.tableCellRight}></Text>
          </View>

          {/* Total Row */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCellLeft, { fontWeight: 'bold' }]}>Total Earnings</Text>
            <Text style={[styles.tableCellRight, { fontWeight: 'bold' }]}>
              {data.total_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.tableCellLeft, { fontWeight: 'bold' }]}>Total Deductions</Text>
            <Text style={[styles.tableCellRight, { fontWeight: 'bold' }]}>
              {data.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Net Pay */}
        <View style={styles.netPaySection}>
          <Text style={styles.netPayText}>NET PAY</Text>
          <Text style={styles.netPayAmount}>{formatCurrency(data.net_pay)}</Text>
        </View>

        {/* Generated Date */}
        <View style={{ marginTop: 15, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: '#666' }}>
            Generated on: {formatDate(data.generated_date)}
          </Text>
        </View>

        {/* Footer with Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureSection}>
            <Text style={styles.signatureLabel}>Employee Signature</Text>
            <View style={styles.signatureLine} />
          </View>
          <View style={styles.signatureSection}>
            <Text style={styles.signatureLabel}>Authorized Signatory</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, marginTop: 10, textAlign: 'center', color: '#666' }}>
              Aggrandize Digital Solutions
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export const generatePayslipPDF = async (data: PayslipData): Promise<Blob> => {
  const doc = <PayslipDocument data={data} />;
  const asPdf = pdf(doc);
  return await asPdf.toBlob();
};

export const downloadPayslipPDF = async (data: PayslipData, filename?: string) => {
  try {
    const pdfBlob = await generatePayslipPDF(data);
    const url = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `payslip_${data.employee.name}_${data.salary_month}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating payslip PDF:', error);
    throw new Error('Failed to generate payslip PDF');
  }
};
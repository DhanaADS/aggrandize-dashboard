'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { ReportData, PDFGenerationOptions } from '@/types/reports';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
    borderBottom: 2,
    borderBottomColor: '#00ff88',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
    textAlign: 'center',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: '#333',
  },
  reportSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#00ff88',
    paddingBottom: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    border: 1,
    borderColor: '#e9ecef',
  },
  summaryCardTitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff88',
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e9ecef',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#00ff88',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e9ecef',
    padding: 8,
  },
  tableColWide: {
    width: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e9ecef',
    padding: 8,
  },
  tableCell: {
    fontSize: 10,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    borderTop: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  },
  text: {
    fontSize: 11,
    color: '#333',
    lineHeight: 1.4,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 11,
    color: '#333',
    lineHeight: 1.4,
    marginLeft: 15,
    marginBottom: 5,
  },
  highlight: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 3,
    marginVertical: 10,
  },
  warningText: {
    color: '#856404',
    fontSize: 10,
  },
});

// Executive Summary Template
const ExecutiveSummaryTemplate: React.FC<{ reportData: ReportData; options: PDFGenerationOptions }> = ({ 
  reportData, 
  options 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{options.company_info.name}</Text>
        <Text style={styles.reportTitle}>Executive Financial Summary</Text>
        <Text style={styles.reportSubtitle}>
          {new Date(reportData.summary.report_month + '-01').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Key Financial Metrics</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Total Monthly Spend</Text>
            <Text style={styles.summaryCardValue}>
              ₹{reportData.summary.total_monthly_spend_inr.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Expenses</Text>
            <Text style={styles.summaryCardValue}>
              ₹{reportData.expenses.total_inr.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Salaries</Text>
            <Text style={styles.summaryCardValue}>
              ₹{reportData.salaries.total_monthly_inr.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Subscriptions</Text>
            <Text style={styles.summaryCardValue}>
              ₹{reportData.subscriptions.total_monthly_inr.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Expense Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Top Expense Categories</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColWide}>
              <Text style={styles.tableCell}>Category</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Amount</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Percentage</Text>
            </View>
          </View>
          {reportData.expenses.by_category.slice(0, 5).map((category, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColWide}>
                <Text style={styles.tableCell}>{category.category_name}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  ₹{category.total_inr.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{category.percentage.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Team Spending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Team Spending Analysis</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColWide}>
              <Text style={styles.tableCell}>Team Member</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Amount</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Transactions</Text>
            </View>
          </View>
          {reportData.expenses.by_person.slice(0, 5).map((person, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColWide}>
                <Text style={styles.tableCell}>{person.person_name}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  ₹{person.total_inr.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{person.count}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Key Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Key Insights & Recommendations</Text>
        {reportData.analytics.recommendations.slice(0, 3).map((rec, index) => (
          <View key={index} style={styles.highlight}>
            <Text style={[styles.text, { fontWeight: 'bold', marginBottom: 5 }]}>
              {rec.title}
            </Text>
            <Text style={styles.warningText}>{rec.description}</Text>
            {rec.potential_savings_inr && (
              <Text style={styles.warningText}>
                Potential Savings: ₹{rec.potential_savings_inr.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • AGGRANDIZE Finance Dashboard
        {'\n'}Report ID: {reportData.metadata.report_version} • Generation Time: {reportData.metadata.generation_time_ms}ms
      </Text>
    </Page>
  </Document>
);

// Detailed Report Template
const DetailedReportTemplate: React.FC<{ reportData: ReportData; options: PDFGenerationOptions }> = ({ 
  reportData, 
  options 
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{options.company_info.name}</Text>
        <Text style={styles.reportTitle}>Detailed Financial Report</Text>
        <Text style={styles.reportSubtitle}>
          {new Date(reportData.summary.report_month + '-01').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </Text>
      </View>

      {/* Executive Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Executive Summary</Text>
        <Text style={styles.text}>
          Total Monthly Spend: ₹{reportData.summary.total_monthly_spend_inr.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.text}>
          Total Transactions: {reportData.expenses.count + reportData.salaries.employee_count + reportData.subscriptions.active_count}
        </Text>
        <Text style={styles.text}>
          Active Team Members: {reportData.summary.team_members_active}
        </Text>
        <Text style={styles.text}>
          Payment Methods Used: {reportData.summary.payment_methods_used}
        </Text>
      </View>

      {/* Detailed Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💸 Detailed Expenses</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Category</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Amount (₹)</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Count</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>%</Text>
            </View>
          </View>
          {reportData.expenses.by_category.map((category, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{category.category_name}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {category.total_inr.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{category.count}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{category.percentage.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • AGGRANDIZE Finance Dashboard
        {'\n'}Page 1 of 2 • Complete data available in Excel export
      </Text>
    </Page>

    {/* Second Page - Additional Details */}
    <Page size="A4" style={styles.page}>
      {/* Salary Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Salary Breakdown</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColWide}>
              <Text style={styles.tableCell}>Employee</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Amount (₹)</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Status</Text>
            </View>
          </View>
          {reportData.salaries.by_employee.map((emp, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColWide}>
                <Text style={styles.tableCell}>{emp.employee_name}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {emp.total_inr.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{emp.payment_status}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Subscriptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Active Subscriptions</Text>
        <Text style={styles.text}>
          Total Monthly Cost: ₹{reportData.subscriptions.total_monthly_inr.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.text}>
          Total Yearly Cost: ₹{reportData.subscriptions.total_yearly_inr.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.text}>
          Active Subscriptions: {reportData.subscriptions.active_count}
        </Text>
        <Text style={styles.text}>
          Upcoming Renewals: {reportData.subscriptions.upcoming_renewals.length}
        </Text>
      </View>

      {/* Data Quality */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Data Quality Report</Text>
        <Text style={styles.text}>
          Completeness Score: {reportData.analytics.data_quality.completeness_score}%
        </Text>
        <Text style={styles.text}>
          Missing Receipts: {reportData.analytics.data_quality.missing_receipts}
        </Text>
        <Text style={styles.text}>
          Unverified Expenses: {reportData.analytics.data_quality.unverified_expenses}
        </Text>
        <Text style={styles.text}>
          Pending Approvals: {reportData.analytics.data_quality.pending_approvals}
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • AGGRANDIZE Finance Dashboard
        {'\n'}Page 2 of 2 • Report ID: {reportData.metadata.report_version}
      </Text>
    </Page>
  </Document>
);

// Export functions
export async function generateExecutiveSummaryPDF(
  reportData: ReportData, 
  options: PDFGenerationOptions
): Promise<Blob> {
  const doc = <ExecutiveSummaryTemplate reportData={reportData} options={options} />;
  return await pdf(doc).toBlob();
}

export async function generateDetailedReportPDF(
  reportData: ReportData, 
  options: PDFGenerationOptions
): Promise<Blob> {
  const doc = <DetailedReportTemplate reportData={reportData} options={options} />;
  return await pdf(doc).toBlob();
}

export async function generateTeamAnalysisPDF(
  reportData: ReportData, 
  options: PDFGenerationOptions
): Promise<Blob> {
  // Team analysis uses the detailed template with focus on team data
  const doc = <DetailedReportTemplate reportData={reportData} options={options} />;
  return await pdf(doc).toBlob();
}

export async function generateCategoryBreakdownPDF(
  reportData: ReportData, 
  options: PDFGenerationOptions
): Promise<Blob> {
  // Category breakdown uses the executive template with focus on categories
  const doc = <ExecutiveSummaryTemplate reportData={reportData} options={options} />;
  return await pdf(doc).toBlob();
}

// Main PDF generation function
export async function generateReportPDF(
  reportType: string,
  reportData: ReportData,
  options: PDFGenerationOptions
): Promise<Blob> {
  switch (reportType) {
    case 'executive_summary':
      return generateExecutiveSummaryPDF(reportData, options);
    case 'detailed_report':
      return generateDetailedReportPDF(reportData, options);
    case 'team_analysis':
      return generateTeamAnalysisPDF(reportData, options);
    case 'category_breakdown':
      return generateCategoryBreakdownPDF(reportData, options);
    default:
      return generateExecutiveSummaryPDF(reportData, options);
  }
}
'use client';

import { MonthlyReport } from '@/types/reports';
import styles from './reports.module.css';

interface ReportViewerProps {
  report: MonthlyReport;
  onBack: () => void;
  onDownload: (format: 'pdf' | 'excel') => void;
  onRegenerate: () => void;
}

export function ReportViewer({ report, onBack, onDownload, onRegenerate }: ReportViewerProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const calculateTotalSpend = () => {
    return (report.total_expenses_inr || 0) + 
           (report.total_salaries_inr || 0) + 
           (report.total_subscriptions_inr || 0) + 
           (report.total_utility_bills_inr || 0);
  };

  return (
    <div className={styles.viewerContainer}>
      {/* Header */}
      <div className={styles.viewerHeader}>
        <button onClick={onBack} className={styles.backButton}>
          ← Back to Reports
        </button>
        
        <div className={styles.viewerTitleSection}>
          <h2 className={styles.viewerTitle}>
            {new Date(report.report_month + '-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })} Financial Report
          </h2>
          <p className={styles.viewerSubtitle}>
            {report.report_type.replace('_', ' ')} • Generated {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className={styles.viewerActions}>
          <button
            onClick={() => onDownload('pdf')}
            className={styles.downloadButton}
          >
            📄 Download PDF
          </button>
          <button
            onClick={() => onDownload('excel')}
            className={styles.downloadButton}
          >
            📊 Download Excel
          </button>
          <button
            onClick={onRegenerate}
            className={styles.regenerateButton}
          >
            🔄 Regenerate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>💰 Total Monthly Spend</h3>
          <div className={styles.summaryCardValue}>
            {formatCurrency(calculateTotalSpend())}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>💸 Expenses</h3>
          <div className={styles.summaryCardValue}>
            {formatCurrency(report.total_expenses_inr || 0)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>👥 Salaries</h3>
          <div className={styles.summaryCardValue}>
            {formatCurrency(report.total_salaries_inr || 0)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>🔄 Subscriptions</h3>
          <div className={styles.summaryCardValue}>
            {formatCurrency(report.total_subscriptions_inr || 0)}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className={styles.reportDataContainer}>
        <h3 className={styles.sectionTitle}>📊 Report Data Preview</h3>
        
        {report.report_data ? (
          <div className={styles.dataPreview}>
            <pre className={styles.jsonPreview}>
              {JSON.stringify(report.report_data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={styles.noDataMessage}>
            <p>Report data is not available for preview. Download the PDF or Excel file to view the complete report.</p>
          </div>
        )}
      </div>
    </div>
  );
}
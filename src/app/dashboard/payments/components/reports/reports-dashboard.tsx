'use client';

import { DashboardStats, MonthlyReport } from '@/types/reports';
import styles from './reports.module.css';

interface ReportsDashboardProps {
  stats: DashboardStats | null;
  onNavigate: (view: 'browser' | 'generator') => void;
  recentReports: MonthlyReport[];
}

export function ReportsDashboard({ stats, onNavigate, recentReports }: ReportsDashboardProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Stats Overview */}
      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardCard}>
          <h3 className={styles.cardTitle}>📊 Reports Overview</h3>
          <div className={styles.cardContent}>
            {stats ? (
              <>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Total Reports:</span>
                  <span className={styles.statValue}>{stats.total_reports}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>This Month:</span>
                  <span className={styles.statValue}>{stats.reports_this_month}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Success Rate:</span>
                  <span className={styles.statValue}>
                    {Math.round((stats.successful_generations / (stats.successful_generations + stats.failed_generations)) * 100) || 0}%
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Avg Generation Time:</span>
                  <span className={styles.statValue}>{Math.round(stats.average_generation_time / 1000)}s</span>
                </div>
              </>
            ) : (
              <p>Loading stats...</p>
            )}
          </div>
          <div className={styles.quickActions}>
            <button
              onClick={() => onNavigate('browser')}
              className={styles.actionButton}
            >
              View All Reports
            </button>
          </div>
        </div>

        <div className={styles.dashboardCard}>
          <h3 className={styles.cardTitle}>🚀 Quick Actions</h3>
          <div className={styles.cardContent}>
            <p>Generate comprehensive financial reports with just a few clicks.</p>
            <ul className={styles.featureList}>
              <li>📈 Executive summaries</li>
              <li>📋 Detailed breakdowns</li>
              <li>👥 Team analysis</li>
              <li>🏷️ Category insights</li>
            </ul>
          </div>
          <div className={styles.quickActions}>
            <button
              onClick={() => onNavigate('generator')}
              className={styles.actionButton}
            >
              Generate New Report
            </button>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className={styles.recentReportsSection}>
        <h3 className={styles.sectionTitle}>📋 Recent Reports</h3>
        
        {recentReports.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📊</div>
            <h4 className={styles.emptyStateTitle}>No reports yet</h4>
            <p className={styles.emptyStateDescription}>
              Generate your first financial report to get started with comprehensive analytics.
            </p>
            <button
              onClick={() => onNavigate('generator')}
              className={styles.actionButton}
            >
              Create First Report
            </button>
          </div>
        ) : (
          <div className={styles.recentReportsGrid}>
            {recentReports.map((report) => (
              <div key={report.id} className={styles.recentReportCard}>
                <div className={styles.reportCardHeader}>
                  <h4 className={styles.reportCardTitle}>
                    {new Date(report.report_month + '-01').toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </h4>
                  <span className={`${styles.reportStatus} ${
                    report.generation_status === 'completed' ? styles.statusCompleted :
                    report.generation_status === 'failed' ? styles.statusFailed :
                    report.generation_status === 'generating' ? styles.statusGenerating :
                    styles.statusPending
                  }`}>
                    {report.generation_status}
                  </span>
                </div>
                
                <div className={styles.reportCardContent}>
                  <p className={styles.reportType}>
                    {report.report_type.replace('_', ' ')}
                  </p>
                  <div className={styles.reportAmount}>
                    {formatCurrency(
                      (report.total_expenses_inr || 0) + 
                      (report.total_salaries_inr || 0) + 
                      (report.total_subscriptions_inr || 0) + 
                      (report.total_utility_bills_inr || 0)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help & Tips */}
      <div className={styles.helpSection}>
        <div className={styles.helpCard}>
          <h3 className={styles.cardTitle}>💡 Tips & Best Practices</h3>
          <div className={styles.cardContent}>
            <ul className={styles.tipsList}>
              <li><strong>Monthly Generation:</strong> Generate reports at the end of each month for accurate data</li>
              <li><strong>Report Types:</strong> Use Executive Summary for high-level overview, Detailed Report for complete analysis</li>
              <li><strong>Export Formats:</strong> PDF for presentations, Excel for further analysis</li>
              <li><strong>Data Quality:</strong> Ensure all expenses and payments are properly categorized before generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
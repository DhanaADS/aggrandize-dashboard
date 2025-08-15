'use client';

import { useState } from 'react';
import { 
  MonthlyReport, 
  ReportFilters,
  ReportType,
  GenerationStatus 
} from '@/types/reports';
import styles from './reports.module.css';

interface ReportBrowserProps {
  reports: MonthlyReport[];
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onReportAction: (action: string, report: MonthlyReport) => void;
  isLoading: boolean;
}

export function ReportBrowser({ 
  reports, 
  filters, 
  onFiltersChange, 
  onReportAction, 
  isLoading 
}: ReportBrowserProps) {
  const [showFilters, setShowFilters] = useState(false);

  const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
    { value: 'executive_summary', label: 'Executive Summary' },
    { value: 'detailed_report', label: 'Detailed Report' },
    { value: 'team_analysis', label: 'Team Analysis' },
    { value: 'category_breakdown', label: 'Category Breakdown' }
  ];

  const statusOptions: Array<{ value: GenerationStatus; label: string }> = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'generating', label: 'Generating' },
    { value: 'failed', label: 'Failed' }
  ];

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getStatusClass = (status: GenerationStatus) => {
    switch (status) {
      case 'completed': return styles.statusCompleted;
      case 'pending': return styles.statusPending;
      case 'generating': return styles.statusGenerating;
      case 'failed': return styles.statusFailed;
      default: return styles.statusPending;
    }
  };

  const getReportTypeLabel = (type: ReportType) => {
    return reportTypeOptions.find(opt => opt.value === type)?.label || type;
  };

  const calculateTotalSpend = (report: MonthlyReport) => {
    return (report.total_expenses_inr || 0) + 
           (report.total_salaries_inr || 0) + 
           (report.total_subscriptions_inr || 0) + 
           (report.total_utility_bills_inr || 0);
  };

  return (
    <div className={styles.browserContainer}>
      {/* Header */}
      <div className={styles.browserHeader}>
        <div className={styles.browserHeaderContent}>
          <h3 className={styles.browserTitle}>📋 Browse Reports</h3>
          <p className={styles.browserSubtitle}>
            View and manage all generated financial reports
          </p>
        </div>
        
        <div className={styles.browserActions}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
          >
            🔍 Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filtersSection}>
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Search</label>
              <input
                type="text"
                placeholder="Search reports..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Report Type</label>
              <select
                value={filters.report_type || ''}
                onChange={(e) => handleFilterChange('report_type', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Types</option>
                {reportTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <select
                value={filters.generation_status || ''}
                onChange={(e) => handleFilterChange('generation_status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Statuses</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Month From</label>
              <input
                type="month"
                value={filters.month_from || ''}
                onChange={(e) => handleFilterChange('month_from', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Month To</label>
              <input
                type="month"
                value={filters.month_to || ''}
                onChange={(e) => handleFilterChange('month_to', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <button
                onClick={clearFilters}
                className={styles.clearFiltersButton}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className={styles.resultsSummary}>
        <span className={styles.resultsCount}>
          {reports.length} report{reports.length !== 1 ? 's' : ''} found
        </span>
        {Object.keys(filters).some(key => filters[key as keyof ReportFilters]) && (
          <span className={styles.filterInfo}>
            (filtered results)
          </span>
        )}
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h4 className={styles.emptyStateTitle}>No reports found</h4>
          <p className={styles.emptyStateDescription}>
            {Object.keys(filters).some(key => filters[key as keyof ReportFilters])
              ? 'Try adjusting your filters or generate a new report.'
              : 'Generate your first financial report to get started.'
            }
          </p>
        </div>
      ) : (
        <div className={styles.reportsGrid}>
          {reports.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              {/* Card Header */}
              <div className={styles.reportHeader}>
                <div className={styles.reportTitleSection}>
                  <h4 className={styles.reportTitle}>
                    {new Date(report.report_month + '-01').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </h4>
                  <p className={styles.reportMeta}>
                    {getReportTypeLabel(report.report_type)} • {report.generated_by_name || 'System'}
                  </p>
                </div>
                
                <div className={`${styles.reportStatus} ${getStatusClass(report.generation_status)}`}>
                  {report.generation_status}
                </div>
              </div>

              {/* Card Content */}
              <div className={styles.reportContent}>
                <div className={styles.reportSummary}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryValue}>
                      {formatCurrency(calculateTotalSpend(report))}
                    </span>
                    <span className={styles.summaryLabel}>Total Spend</span>
                  </div>
                  
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryValue}>
                      {formatCurrency(report.total_expenses_inr || 0)}
                    </span>
                    <span className={styles.summaryLabel}>Expenses</span>
                  </div>
                </div>

                <div className={styles.reportDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Salaries:</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(report.total_salaries_inr || 0)}
                    </span>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Subscriptions:</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(report.total_subscriptions_inr || 0)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Generated:</span>
                    <span className={styles.detailValue}>
                      {report.created_at ? 
                        new Date(report.created_at).toLocaleDateString() : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className={styles.reportActions}>
                {report.generation_status === 'completed' && (
                  <>
                    <button
                      onClick={() => onReportAction('view', report)}
                      className={`${styles.reportActionButton} ${styles.actionPrimary}`}
                    >
                      👁️ View
                    </button>
                    
                    <button
                      onClick={() => onReportAction('download_pdf', report)}
                      className={styles.reportActionButton}
                      title="Download PDF"
                    >
                      📄 PDF
                    </button>
                    
                    <button
                      onClick={() => onReportAction('download_excel', report)}
                      className={styles.reportActionButton}
                      title="Download Excel"
                    >
                      📊 Excel
                    </button>
                  </>
                )}

                {report.generation_status === 'failed' && (
                  <button
                    onClick={() => onReportAction('regenerate', report)}
                    className={styles.reportActionButton}
                  >
                    🔄 Retry
                  </button>
                )}

                {report.generation_status === 'completed' && (
                  <button
                    onClick={() => onReportAction('regenerate', report)}
                    className={styles.reportActionButton}
                  >
                    🔄 Regenerate
                  </button>
                )}

                <button
                  onClick={() => onReportAction('delete', report)}
                  className={`${styles.reportActionButton} ${styles.actionDanger}`}
                  title="Delete Report"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
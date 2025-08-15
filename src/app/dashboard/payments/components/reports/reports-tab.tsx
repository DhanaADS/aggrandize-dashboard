'use client';

import { useState, useEffect } from 'react';
import { ReportBrowser } from './report-browser';
import { ReportGenerator } from './report-generator';
import { ReportViewer } from './report-viewer';
import { ReportsDashboard } from './reports-dashboard';
import { 
  MonthlyReport, 
  ReportFilters, 
  ReportGenerationRequest,
  ReportTemplate,
  DashboardStats
} from '@/types/reports';
import { 
  getMonthlyReports, 
  getReportTemplates, 
  getReportsDashboardStats,
  createMonthlyReport,
  updateMonthlyReportStatus
} from '@/lib/reports/report-persistence';
import { ReportGenerator as DataGenerator } from '@/lib/reports/report-generator';
import styles from './reports.module.css';

type ReportsView = 'dashboard' | 'browser' | 'generator' | 'viewer';

export function ReportsTab() {
  const [activeView, setActiveView] = useState<ReportsView>('dashboard');
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters for report browser
  const [filters, setFilters] = useState<ReportFilters>({});

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadReports();
    loadTemplates();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      const stats = await getReportsDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set default stats as fallback
      setDashboardStats({
        total_reports: 0,
        reports_this_month: 0,
        successful_generations: 0,
        failed_generations: 0,
        average_generation_time: 0,
        most_popular_report_type: 'executive_summary'
      });
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const reportsData = await getMonthlyReports(filters);
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      // Set empty array as fallback to prevent errors
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await getReportTemplates();
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Set empty array as fallback to prevent errors
      setTemplates([]);
    }
  };

  const handleFiltersChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    loadReports();
  };

  const handleGenerateReport = async (request: ReportGenerationRequest) => {
    try {
      setIsGenerating(true);
      
      // Create report generator
      const generator = new DataGenerator(request.report_month);
      
      // Generate report data
      const reportData = await generator.generateReport(request);
      
      // Save to database
      const savedReport = await createMonthlyReport(
        request.report_month,
        request.report_type,
        reportData
      );

      // Update status to completed
      await updateMonthlyReportStatus(savedReport.id, 'completed');
      
      // Refresh data
      setRefreshTrigger(prev => prev + 1);
      
      // Switch to browser view to show the new report
      setActiveView('browser');
      
      console.log('Report generated successfully:', savedReport);
      
    } catch (error) {
      console.error('Error generating report:', error);
      // In a real app, you'd show a user-friendly error message
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReportAction = (action: string, report: MonthlyReport) => {
    switch (action) {
      case 'view':
        setSelectedReport(report);
        setActiveView('viewer');
        break;
      case 'download_pdf':
        if (report.pdf_url) {
          window.open(report.pdf_url, '_blank');
        } else {
          console.log('PDF generation would be triggered here');
        }
        break;
      case 'download_excel':
        if (report.excel_url) {
          window.open(report.excel_url, '_blank');
        } else {
          console.log('Excel generation would be triggered here');
        }
        break;
      case 'regenerate':
        console.log('Regenerate report:', report);
        // Implement regeneration logic
        break;
      case 'delete':
        console.log('Delete report:', report);
        // Implement deletion logic with confirmation
        break;
    }
  };

  const viewButtons = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'browser' as const, label: 'Browse Reports', icon: '📋' },
    { id: 'generator' as const, label: 'Generate Report', icon: '🔄' },
  ];

  return (
    <div className={styles.reportsContainer}>
      {/* Header */}
      <div className={styles.reportsHeader}>
        <div className={styles.headerContent}>
          <h2 className={styles.reportsTitle}>📈 Payment Reports</h2>
          <p className={styles.reportsSubtitle}>
            Generate, manage, and export comprehensive financial reports
          </p>
        </div>
        <div className={styles.headerStats}>
          {dashboardStats && (
            <>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{dashboardStats.total_reports}</span>
                <span className={styles.statLabel}>Total Reports</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{dashboardStats.reports_this_month}</span>
                <span className={styles.statLabel}>This Month</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {Math.round((dashboardStats.successful_generations / (dashboardStats.successful_generations + dashboardStats.failed_generations)) * 100) || 0}%
                </span>
                <span className={styles.statLabel}>Success Rate</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Navigation */}
      <div className={styles.viewNavigation}>
        {viewButtons.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`${styles.viewButton} ${
              activeView === view.id ? styles.viewButtonActive : ''
            }`}
          >
            <span className={styles.viewIcon}>{view.icon}</span>
            <span className={styles.viewLabel}>{view.label}</span>
          </button>
        ))}
        
        {selectedReport && activeView === 'viewer' && (
          <div className={styles.viewerBreadcrumb}>
            <span className={styles.breadcrumbSeparator}>→</span>
            <span className={styles.breadcrumbItem}>
              {selectedReport.report_month} - {selectedReport.report_type.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {(isLoading || isGenerating) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>
              {isGenerating ? 'Generating Report...' : 'Loading...'}
            </p>
          </div>
        </div>
      )}

      {/* View Content */}
      <div className={styles.viewContent}>
        {activeView === 'dashboard' && (
          <ReportsDashboard 
            stats={dashboardStats}
            onNavigate={setActiveView}
            recentReports={reports.slice(0, 5)}
          />
        )}

        {activeView === 'browser' && (
          <ReportBrowser
            reports={reports}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReportAction={handleReportAction}
            isLoading={isLoading}
          />
        )}

        {activeView === 'generator' && (
          <ReportGenerator
            onGenerate={handleGenerateReport}
            isGenerating={isGenerating}
            availableTemplates={templates}
          />
        )}

        {activeView === 'viewer' && selectedReport && (
          <ReportViewer
            report={selectedReport}
            onBack={() => setActiveView('browser')}
            onDownload={(format) => handleReportAction(`download_${format}`, selectedReport)}
            onRegenerate={() => handleReportAction('regenerate', selectedReport)}
          />
        )}
      </div>
    </div>
  );
}
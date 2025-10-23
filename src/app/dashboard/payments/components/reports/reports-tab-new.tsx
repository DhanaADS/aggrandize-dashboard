'use client';

import { useState, useEffect } from 'react';
import styles from './reports-clean.module.css';

interface Report {
  id: string;
  name: string;
  status: 'Generated' | 'Scheduled' | 'Pending' | 'Failed';
  generatedAt: string;
  type: string;
}

export function ReportsTab() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Generated' | 'Scheduled'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data matching the design
  useEffect(() => {
    const mockReports: Report[] = [
      {
        id: '1',
        name: 'Monthly Sales Report',
        status: 'Generated',
        generatedAt: '2024-03-15 10:00 AM',
        type: 'sales'
      },
      {
        id: '2',
        name: 'Quarterly Financial Report',
        status: 'Scheduled',
        generatedAt: '2024-03-20 09:00 AM',
        type: 'financial'
      },
      {
        id: '3',
        name: 'Annual Tax Report',
        status: 'Generated',
        generatedAt: '2024-03-01 02:00 PM',
        type: 'tax'
      },
      {
        id: '4',
        name: 'Inventory Report',
        status: 'Generated',
        generatedAt: '2024-02-28 04:30 PM',
        type: 'inventory'
      },
      {
        id: '5',
        name: 'Customer Activity Report',
        status: 'Scheduled',
        generatedAt: '2024-03-22 11:00 AM',
        type: 'customer'
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setReports(mockReports);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesFilter = activeFilter === 'All' || report.status === activeFilter;
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Generated':
        return `${styles.statusBadge} ${styles.statusGenerated}`;
      case 'Scheduled':
        return `${styles.statusBadge} ${styles.statusScheduled}`;
      case 'Pending':
        return `${styles.statusBadge} ${styles.statusPending}`;
      case 'Failed':
        return `${styles.statusBadge} ${styles.statusFailed}`;
      default:
        return `${styles.statusBadge} ${styles.statusGenerated}`;
    }
  };

  const handleViewReport = (report: Report) => {
    console.log('Viewing report:', report);
    // Implement view logic here
  };

  const handleNewReport = () => {
    console.log('Creating new report');
    // Implement new report logic here
  };

  return (
    <div className={styles.reportsContainer}>
      {/* Left Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Reports</h2>
        </div>
        
        <nav className={styles.navigation}>
          <a href="#" className={`${styles.navItem}`}>
            <span className={`${styles.navIcon} material-symbols-outlined`}>bar_chart</span>
            <span>Overview</span>
          </a>
          <a href="#" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={`${styles.navIcon} material-symbols-outlined`}>description</span>
            <span>Reports</span>
          </a>
          <a href="#" className={`${styles.navItem}`}>
            <span className={`${styles.navIcon} material-symbols-outlined`}>draft</span>
            <span>Templates</span>
          </a>
          <a href="#" className={`${styles.navItem}`}>
            <span className={`${styles.navIcon} material-symbols-outlined`}>settings</span>
            <span>Settings</span>
          </a>
        </nav>
        
        <div className={styles.sidebarFooter}>
          <button className={styles.newReportButton} onClick={handleNewReport}>
            <span className={`${styles.newReportIcon} material-symbols-outlined`}>add</span>
            New Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>Reports</h1>
            <p className={styles.subtitle}>Manage and generate reports for your business</p>
          </div>

          {/* Statistics Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Reports</span>
              <span className={styles.statValue}>1,234</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Generated This Month</span>
              <span className={styles.statValue}>156</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Avg. Generation Time</span>
              <span className={styles.statValue}>2m 30s</span>
            </div>
          </div>

          {/* Report Browser */}
          <div className={styles.reportBrowser}>
            <div className={styles.browserHeader}>
              <h2 className={styles.browserTitle}>Report Browser</h2>
              
              <div className={styles.browserControls}>
                {/* Search */}
                <div className={styles.searchContainer}>
                  <span className={`${styles.searchIcon} material-symbols-outlined`}>search</span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Filter Tabs */}
                <div className={styles.filterTabs}>
                  {['All', 'Generated', 'Scheduled'].map((filter) => (
                    <button
                      key={filter}
                      className={
                        activeFilter === filter
                          ? `${styles.filterTab} ${styles.filterTabActive}`
                          : `${styles.filterTab} ${styles.filterTabInactive}`
                      }
                      onClick={() => setActiveFilter(filter as 'All' | 'Generated' | 'Scheduled')}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reports Table */}
            <div className={styles.tableContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  Loading reports...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📋</div>
                  <div className={styles.emptyStateTitle}>No Reports Found</div>
                  <div className={styles.emptyStateDescription}>
                    {searchTerm ? `No reports match "${searchTerm}"` : 'No reports available for the selected filter.'}
                  </div>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th className={styles.tableHeadCell}>Report Name</th>
                      <th className={styles.tableHeadCell}>Status</th>
                      <th className={styles.tableHeadCell}>Generated At</th>
                      <th className={styles.tableHeadCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tableBody}>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <span className={styles.reportName}>{report.name}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={getStatusBadgeClass(report.status)}>
                            {report.status}
                          </span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.generatedAt}>{report.generatedAt}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleViewReport(report)}
                          >
                            <span className={`${styles.actionIcon} material-symbols-outlined`}>visibility</span>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
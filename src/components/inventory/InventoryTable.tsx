'use client';

import React, { useState } from 'react';
import { WebsiteInventory, SortConfig } from '@/types/inventory';
import styles from './inventory-components.module.css';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InventoryTableProps {
  websites: WebsiteInventory[];
  loading?: boolean;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  selectedWebsites: Set<string>;
  onWebsiteSelect: (websiteId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onWebsiteUpdate: (websiteId: string) => void;
  onWebsiteDelete: (websiteId: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  websites,
  loading = false,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onLimitChange,
  selectedWebsites,
  onWebsiteSelect,
  onSelectAll,
  onWebsiteUpdate,
  onWebsiteDelete
}) => {
  const [editingWebsite, setEditingWebsite] = useState<string | null>(null);

  // Format numbers for display
  const formatNumber = (num?: number | null): string => {
    if (!num) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num?: number | null): string => {
    if (!num) return '-';
    return `$${num.toLocaleString()}`;
  };

  // Get value class based on thresholds
  const getValueClass = (value?: number | null, type: 'dr' | 'traffic' | 'backlinks' = 'dr'): string => {
    if (!value) return styles.lowValue;
    
    switch (type) {
      case 'dr':
        if (value >= 80) return styles.highValue;
        if (value >= 50) return styles.mediumValue;
        return styles.lowValue;
      case 'traffic':
        if (value >= 1000000) return styles.highValue;
        if (value >= 100000) return styles.mediumValue;
        return styles.lowValue;
      case 'backlinks':
        if (value >= 10000) return styles.highValue;
        if (value >= 1000) return styles.mediumValue;
        return styles.lowValue;
      default:
        return styles.lowValue;
    }
  };

  // Handle column sorting
  const handleSort = (column: keyof WebsiteInventory) => {
    const newDirection = sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction: newDirection });
  };

  // Handle select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll(e.target.checked);
  };

  // Handle individual row selection
  const handleRowSelect = (websiteId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onWebsiteSelect(websiteId, e.target.checked);
  };

  // Handle website editing
  const handleEdit = (websiteId: string) => {
    setEditingWebsite(websiteId);
    onWebsiteUpdate(websiteId);
  };

  // Handle website deletion
  const handleDelete = (websiteId: string) => {
    if (confirm('Are you sure you want to delete this website?')) {
      onWebsiteDelete(websiteId);
    }
  };

  // Render boolean indicator
  const BooleanIndicator: React.FC<{ value: boolean }> = ({ value }) => (
    <div className={`${styles.booleanIndicator} ${value ? styles.booleanTrue : styles.booleanFalse}`}>
      {value ? '✓' : '✗'}
    </div>
  );

  // Render status badge
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <div className={`${styles.statusBadge} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
      {status}
    </div>
  );

  // Render category badge
  const CategoryBadge: React.FC<{ category?: string | null }> = ({ category }) => {
    if (!category) return <span>-</span>;
    return <div className={styles.categoryBadge}>{category}</div>;
  };

  // Render niche warning badges
  const NicheWarnings: React.FC<{ website: WebsiteInventory }> = ({ website }) => {
    const niches = [];
    if (website.cbd) niches.push('CBD');
    if (website.casino) niches.push('Casino');
    if (website.dating) niches.push('Dating');
    if (website.crypto) niches.push('Crypto');

    if (niches.length === 0) return <span>-</span>;

    return (
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {niches.map(niche => (
          <div key={niche} className={`${styles.statusBadge} ${styles.nicheWarning}`}>
            {niche}
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading && websites.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loadingOverlay}>
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && websites.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h3 className={styles.emptyStateTitle}>No Websites Found</h3>
          <p className={styles.emptyStateText}>
            No websites match your current filters. Try adjusting your search criteria or add a new website to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.tableHeader}>
          <tr>
            <th className={styles.tableHeaderCell}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedWebsites.size === websites.length && websites.length > 0}
                onChange={handleSelectAll}
                title="Select all websites"
              />
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('website')}>
              <div className={styles.sortable}>
                Website
                <span className={`${styles.sortIcon} ${sort.column === 'website' ? styles.active : ''}`}>
                  {sort.column === 'website' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('contact')}>
              <div className={styles.sortable}>
                Contact
                <span className={`${styles.sortIcon} ${sort.column === 'contact' ? styles.active : ''}`}>
                  {sort.column === 'contact' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('client_price')}>
              <div className={styles.sortable}>
                Client Price
                <span className={`${styles.sortIcon} ${sort.column === 'client_price' ? styles.active : ''}`}>
                  {sort.column === 'client_price' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('price')}>
              <div className={styles.sortable}>
                Our Price
                <span className={`${styles.sortIcon} ${sort.column === 'price' ? styles.active : ''}`}>
                  {sort.column === 'price' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('domain_rating')}>
              <div className={styles.sortable}>
                DR
                <span className={`${styles.sortIcon} ${sort.column === 'domain_rating' ? styles.active : ''}`}>
                  {sort.column === 'domain_rating' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('da')}>
              <div className={styles.sortable}>
                DA
                <span className={`${styles.sortIcon} ${sort.column === 'da' ? styles.active : ''}`}>
                  {sort.column === 'da' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('backlinks')}>
              <div className={styles.sortable}>
                Backlinks
                <span className={`${styles.sortIcon} ${sort.column === 'backlinks' ? styles.active : ''}`}>
                  {sort.column === 'backlinks' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('organic_traffic')}>
              <div className={styles.sortable}>
                Organic Traffic
                <span className={`${styles.sortIcon} ${sort.column === 'organic_traffic' ? styles.active : ''}`}>
                  {sort.column === 'organic_traffic' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('us_traffic')}>
              <div className={styles.sortable}>
                US Traffic
                <span className={`${styles.sortIcon} ${sort.column === 'us_traffic' ? styles.active : ''}`}>
                  {sort.column === 'us_traffic' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('uk_traffic')}>
              <div className={styles.sortable}>
                UK Traffic
                <span className={`${styles.sortIcon} ${sort.column === 'uk_traffic' ? styles.active : ''}`}>
                  {sort.column === 'uk_traffic' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('canada_traffic')}>
              <div className={styles.sortable}>
                Canada Traffic
                <span className={`${styles.sortIcon} ${sort.column === 'canada_traffic' ? styles.active : ''}`}>
                  {sort.column === 'canada_traffic' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('is_indexed')}>
              <div className={styles.sortable}>
                Indexed
                <span className={`${styles.sortIcon} ${sort.column === 'is_indexed' ? styles.active : ''}`}>
                  {sort.column === 'is_indexed' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell}>AI Flags</th>
            <th className={styles.tableHeaderCell}>Content</th>
            <th className={styles.tableHeaderCell}>Niches</th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('category')}>
              <div className={styles.sortable}>
                Category
                <span className={`${styles.sortIcon} ${sort.column === 'category' ? styles.active : ''}`}>
                  {sort.column === 'category' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('tat')}>
              <div className={styles.sortable}>
                TAT (Days)
                <span className={`${styles.sortIcon} ${sort.column === 'tat' ? styles.active : ''}`}>
                  {sort.column === 'tat' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell} onClick={() => handleSort('status')}>
              <div className={styles.sortable}>
                Status
                <span className={`${styles.sortIcon} ${sort.column === 'status' ? styles.active : ''}`}>
                  {sort.column === 'status' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </div>
            </th>
            <th className={styles.tableHeaderCell}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {websites.map((website) => (
            <tr
              key={website.id}
              className={`${styles.tableRow} ${selectedWebsites.has(website.id) ? styles.selected : ''} ${loading ? styles.loadingRow : ''}`}
            >
              <td className={styles.tableCell}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={selectedWebsites.has(website.id)}
                  onChange={handleRowSelect(website.id)}
                />
              </td>
              <td className={`${styles.tableCell} ${styles.websiteCell}`}>
                <a
                  href={`https://${website.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.websiteLink}
                  title={website.website}
                >
                  {website.website}
                </a>
              </td>
              <td className={`${styles.tableCell} ${styles.contactCell}`}>
                {website.contact || '-'}
              </td>
              <td className={`${styles.tableCell} ${styles.priceCell}`}>
                {formatCurrency(website.client_price)}
              </td>
              <td className={`${styles.tableCell} ${styles.priceCell}`}>
                {formatCurrency(website.price)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.domain_rating, 'dr')}`}>
                {website.domain_rating || '-'}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.da, 'dr')}`}>
                {website.da || '-'}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.backlinks, 'backlinks')}`}>
                {formatNumber(website.backlinks)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.organic_traffic, 'traffic')}`}>
                {formatNumber(website.organic_traffic)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.us_traffic, 'traffic')}`}>
                {formatNumber(website.us_traffic)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.uk_traffic, 'traffic')}`}>
                {formatNumber(website.uk_traffic)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell} ${getValueClass(website.canada_traffic, 'traffic')}`}>
                {formatNumber(website.canada_traffic)}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <BooleanIndicator value={website.is_indexed} />
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {website.ai_overview && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="AI Overview">AI</div>}
                  {website.chatgpt && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="ChatGPT">GPT</div>}
                  {website.perplexity && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="Perplexity">PPX</div>}
                  {website.gemini && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="Gemini">GEM</div>}
                  {website.copilot && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="Copilot">COP</div>}
                </div>
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {website.do_follow && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="Do Follow">DF</div>}
                  {website.news && <div className={`${styles.statusBadge} ${styles.statusActive}`} title="News">News</div>}
                  {website.sponsored && <div className={`${styles.statusBadge} ${styles.statusPending}`} title="Sponsored">Sponsor</div>}
                </div>
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <NicheWarnings website={website} />
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <CategoryBadge category={website.category} />
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                {website.tat ? `${website.tat}d` : '-'}
              </td>
              <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                <StatusBadge status={website.status} />
              </td>
              <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                <button
                  onClick={() => handleEdit(website.id)}
                  className={styles.actionButton}
                  title="Edit website"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(website.id)}
                  className={`${styles.actionButton} ${styles.delete}`}
                  title="Delete website"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} websites
        </div>
        <div className={styles.paginationControls}>
          <select
            value={pagination.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={styles.pageSelect}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
          
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={styles.paginationButton}
          >
            ← Previous
          </button>
          
          <select
            value={pagination.page}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className={styles.pageSelect}
          >
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className={styles.paginationButton}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
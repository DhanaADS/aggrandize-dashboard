'use client';

import React, { useState } from 'react';
import { WebsiteInventory, SortConfig } from '@/types/inventory';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import styles from './inventory-components.module.css';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface EnhancedInventoryTableProps {
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

const EnhancedInventoryTable: React.FC<EnhancedInventoryTableProps> = ({
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
  const [copiedWebsite, setCopiedWebsite] = useState<string | null>(null);

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

  // Copy website URL to clipboard
  const copyWebsiteUrl = async (website: string) => {
    try {
      await navigator.clipboard.writeText(website);
      setCopiedWebsite(website);
      setTimeout(() => setCopiedWebsite(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Open website in new tab
  const openWebsite = (website: string) => {
    window.open(`https://${website}`, '_blank', 'noopener,noreferrer');
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className={styles.statusIconActive} />;
      case 'inactive':
        return <XCircle size={16} className={styles.statusIconInactive} />;
      case 'pending':
        return <Clock size={16} className={styles.statusIconPending} />;
      case 'blacklisted':
        return <AlertCircle size={16} className={styles.statusIconBlacklisted} />;
      default:
        return <Circle size={16} />;
    }
  };

  // Render boolean indicator with better icons
  const BooleanIndicator: React.FC<{ value: boolean; label?: string }> = ({ value, label }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`${styles.booleanIndicator} ${value ? styles.booleanTrue : styles.booleanFalse}`}>
            {value ? <CheckCircle size={12} /> : <XCircle size={12} />}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} {value ? 'Yes' : 'No'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Render status badge with icon
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <div className={`${styles.statusBadge} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
      {getStatusIcon(status)}
      <span style={{ marginLeft: '4px', textTransform: 'capitalize' }}>{status}</span>
    </div>
  );

  // Render category badge
  const CategoryBadge: React.FC<{ category?: string | null }> = ({ category }) => {
    if (!category) return <span>-</span>;
    return (
      <div className={styles.categoryBadge}>
        {category}
      </div>
    );
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
          <TooltipProvider key={niche}>
            <Tooltip>
              <TooltipTrigger>
                <div className={`${styles.statusBadge} ${styles.nicheWarning}`}>
                  {niche.slice(0, 3).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{niche} content detected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  // Render contact avatar with fallback
  const ContactAvatar: React.FC<{ contact?: string | null }> = ({ contact }) => {
    if (!contact) return <span>-</span>;
    
    const getInitials = (name: string) => {
      return name.split('@')[0].slice(0, 2).toUpperCase();
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Avatar style={{ width: '24px', height: '24px' }}>
                <AvatarFallback style={{ fontSize: '10px' }}>
                  {getInitials(contact)}
                </AvatarFallback>
              </Avatar>
              <span className={styles.contactText}>{contact.split('@')[0]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{contact}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render sortable header
  const SortableHeader: React.FC<{ column: keyof WebsiteInventory; children: React.ReactNode }> = ({ 
    column, 
    children 
  }) => (
    <th 
      className={styles.tableHeaderCell} 
      onClick={() => handleSort(column)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div className={styles.sortable}>
        {children}
        <span className={`${styles.sortIcon} ${sort.column === column ? styles.active : ''}`}>
          {sort.column === column ? (
            sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          ) : (
            <ChevronUp size={14} style={{ opacity: 0.3 }} />
          )}
        </span>
      </div>
    </th>
  );

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
    <TooltipProvider>
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell} style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedWebsites.size === websites.length && websites.length > 0}
                    onChange={handleSelectAll}
                    title="Select all websites"
                  />
                </th>
                <SortableHeader column="website">Website</SortableHeader>
                <SortableHeader column="contact">Contact</SortableHeader>
                <SortableHeader column="client_price">Client Price</SortableHeader>
                <SortableHeader column="price">Our Price</SortableHeader>
                <SortableHeader column="domain_rating">DR</SortableHeader>
                <SortableHeader column="da">DA</SortableHeader>
                <SortableHeader column="backlinks">Backlinks</SortableHeader>
                <SortableHeader column="organic_traffic">Organic Traffic</SortableHeader>
                <SortableHeader column="us_traffic">US Traffic</SortableHeader>
                <SortableHeader column="uk_traffic">UK Traffic</SortableHeader>
                <SortableHeader column="canada_traffic">Canada Traffic</SortableHeader>
                <SortableHeader column="is_indexed">Indexed</SortableHeader>
                <th className={styles.tableHeaderCell}>AI Flags</th>
                <th className={styles.tableHeaderCell}>Content</th>
                <th className={styles.tableHeaderCell}>Niches</th>
                <SortableHeader column="category">Category</SortableHeader>
                <SortableHeader column="tat">TAT (Days)</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <th className={styles.tableHeaderCell} style={{ width: '80px' }}>Actions</th>
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
                    <Tooltip>
                      <TooltipTrigger>
                        <div 
                          className={styles.websiteLink}
                          onClick={() => openWebsite(website.website)}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <ExternalLink size={14} />
                          <span>{website.website}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to open {website.website}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={`${styles.tableCell} ${styles.contactCell}`}>
                    <ContactAvatar contact={website.contact} />
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
                    <BooleanIndicator value={website.is_indexed} label="Indexed" />
                  </td>
                  <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {website.ai_overview && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>AI</div>
                          </TooltipTrigger>
                          <TooltipContent><p>AI Overview</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.chatgpt && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>GPT</div>
                          </TooltipTrigger>
                          <TooltipContent><p>ChatGPT</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.perplexity && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>PPX</div>
                          </TooltipTrigger>
                          <TooltipContent><p>Perplexity</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.gemini && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>GEM</div>
                          </TooltipTrigger>
                          <TooltipContent><p>Gemini</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.copilot && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>COP</div>
                          </TooltipTrigger>
                          <TooltipContent><p>Copilot</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className={`${styles.tableCell} ${styles.metricsCell}`}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {website.do_follow && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>DF</div>
                          </TooltipTrigger>
                          <TooltipContent><p>Do Follow</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.news && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusActive}`}>News</div>
                          </TooltipTrigger>
                          <TooltipContent><p>News Site</p></TooltipContent>
                        </Tooltip>
                      )}
                      {website.sponsored && (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`${styles.statusBadge} ${styles.statusPending}`}>Sponsor</div>
                          </TooltipTrigger>
                          <TooltipContent><p>Sponsored Content</p></TooltipContent>
                        </Tooltip>
                      )}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={styles.actionButton}
                          title="More actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openWebsite(website.website)}>
                          <ExternalLink size={16} />
                          Open Website
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyWebsiteUrl(website.website)}>
                          <Copy size={16} />
                          {copiedWebsite === website.website ? 'Copied!' : 'Copy URL'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onWebsiteUpdate(website.id)}>
                          <Edit size={16} />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onWebsiteDelete(website.id)}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
    </TooltipProvider>
  );
};

export default EnhancedInventoryTable;
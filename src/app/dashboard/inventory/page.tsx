'use client';

import React, { useState, useEffect } from 'react';
import { WebsiteInventory, InventoryFilters, InventoryMetrics, SortConfig } from '@/types/inventory';
import inventoryApi from '@/lib/inventory-api';
import InventoryMetricsCards from '@/components/inventory/InventoryMetricsCards';
import EnhancedInventoryTable from '@/components/inventory/EnhancedInventoryTable';
import InventoryFiltersComponent from '@/components/inventory/InventoryFilters';
import AddWebsiteModal from '@/components/inventory/AddWebsiteModal';
import BulkActionsBar from '@/components/inventory/BulkActionsBar';
import styles from './inventory.module.css';

export default function InventoryPage() {
  const [websites, setWebsites] = useState<WebsiteInventory[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [sort, setSort] = useState<SortConfig>({ column: 'created_at', direction: 'desc' });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebsites, setSelectedWebsites] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load websites and metrics
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [websitesResponse, metricsData] = await Promise.all([
        inventoryApi.getWebsites(filters, pagination.page, pagination.limit, sort),
        inventoryApi.getMetrics()
      ]);

      setWebsites(websitesResponse.websites);
      setPagination(websitesResponse.pagination);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters/sort/pagination changes
  useEffect(() => {
    loadData();
  }, [filters, sort, pagination.page, pagination.limit, refreshTrigger]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle sort changes
  const handleSortChange = (newSort: SortConfig) => {
    setSort(newSort);
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  // Handle website selection
  const handleWebsiteSelect = (websiteId: string, selected: boolean) => {
    const newSelected = new Set(selectedWebsites);
    if (selected) {
      newSelected.add(websiteId);
    } else {
      newSelected.delete(websiteId);
    }
    setSelectedWebsites(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedWebsites(new Set(websites.map(w => w.id)));
    } else {
      setSelectedWebsites(new Set());
    }
  };

  // Handle website operations
  const handleWebsiteAdd = async () => {
    setRefreshTrigger(prev => prev + 1);
    setShowAddModal(false);
    setSelectedWebsites(new Set());
  };

  const handleWebsiteUpdate = async () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedWebsites(new Set());
  };

  const handleWebsiteDelete = async () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedWebsites(new Set());
  };

  // Handle bulk operations
  const handleBulkAction = async () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedWebsites(new Set());
  };

  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Website Inventory</h1>
            <p className={styles.subtitle}>
              Digital Marketing Website Database with SEO Metrics
            </p>
          </div>
        </div>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>❌</div>
          <h3>Error Loading Inventory</h3>
          <p>{error}</p>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Website Inventory</h1>
          <p className={styles.subtitle}>
            Digital Marketing Website Database with SEO Metrics
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
          >
            🔍 Filters
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className={styles.addButton}
          >
            ➕ Add Website
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <InventoryMetricsCards 
          metrics={metrics} 
          loading={loading}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedWebsites.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedWebsites.size}
          selectedWebsiteIds={Array.from(selectedWebsites)}
          onBulkAction={handleBulkAction}
          onClear={() => setSelectedWebsites(new Set())}
        />
      )}

      {/* Filters Sidebar */}
      {showFilters && (
        <InventoryFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClose={() => setShowFilters(false)}
          onClear={clearFilters}
          loading={loading}
        />
      )}

      {/* Main Table */}
      <div className={styles.tableContainer}>
        <EnhancedInventoryTable
          websites={websites}
          loading={loading}
          sort={sort}
          onSortChange={handleSortChange}
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          selectedWebsites={selectedWebsites}
          onWebsiteSelect={handleWebsiteSelect}
          onSelectAll={handleSelectAll}
          onWebsiteUpdate={handleWebsiteUpdate}
          onWebsiteDelete={handleWebsiteDelete}
        />
      </div>

      {/* Add Website Modal */}
      {showAddModal && (
        <AddWebsiteModal
          onClose={() => setShowAddModal(false)}
          onWebsiteAdd={handleWebsiteAdd}
        />
      )}
    </div>
  );
}
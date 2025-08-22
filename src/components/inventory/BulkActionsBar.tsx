'use client';

import React, { useState } from 'react';
import inventoryApi from '@/lib/inventory-api';
import styles from './inventory-components.module.css';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedWebsiteIds: string[];
  onBulkAction: () => void;
  onClear: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedWebsiteIds,
  onBulkAction,
  onClear
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  // Handle bulk actions
  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedWebsiteIds.length === 0) return;

    setLoading(true);
    try {
      await inventoryApi.bulkAction({
        action,
        website_ids: selectedWebsiteIds,
        data
      });
      
      onBulkAction();
      setShowConfirm(null);
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      alert(`Failed to ${action} websites. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Confirm destructive actions
  const confirmAction = (action: string, message: string) => {
    if (confirm(message)) {
      handleBulkAction(action);
    }
  };

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      await inventoryApi.downloadExport({
        format,
        filters: { website_ids: selectedWebsiteIds },
        filename: `selected-websites-${new Date().toISOString().split('T')[0]}`
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk status update
  const handleStatusUpdate = (status: 'active' | 'inactive' | 'pending' | 'blacklisted') => {
    const statusLabels = {
      active: 'activate',
      inactive: 'deactivate',
      pending: 'mark as pending',
      blacklisted: 'blacklist'
    };
    
    const message = `Are you sure you want to ${statusLabels[status]} ${selectedCount} website${selectedCount !== 1 ? 's' : ''}?`;
    
    if (confirm(message)) {
      handleBulkAction('update_status', { status });
    }
  };

  // Bulk category update
  const handleCategoryUpdate = () => {
    const category = prompt('Enter new category for selected websites:');
    if (category !== null && category.trim() !== '') {
      handleBulkAction('update_category', { category: category.trim() });
    }
  };

  return (
    <div className={styles.bulkActionsBar}>
      <div className={styles.bulkActionsLeft}>
        <div className={styles.bulkActionsCount}>
          <span className={styles.bulkCountNumber}>{selectedCount}</span>
          <span className={styles.bulkCountText}>
            website{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        <button
          onClick={onClear}
          className={styles.bulkActionButton}
          disabled={loading}
          title="Clear selection"
        >
          Clear
        </button>
      </div>

      <div className={styles.bulkActionsRight}>
        {/* Status Actions */}
        <div className={styles.bulkActionGroup}>
          <span className={styles.bulkActionGroupLabel}>Status:</span>
          <button
            onClick={() => handleStatusUpdate('active')}
            className={`${styles.bulkActionButton} ${styles.bulkActionSuccess}`}
            disabled={loading}
            title="Activate selected websites"
          >
            ✅ Activate
          </button>
          <button
            onClick={() => handleStatusUpdate('inactive')}
            className={`${styles.bulkActionButton} ${styles.bulkActionWarning}`}
            disabled={loading}
            title="Deactivate selected websites"
          >
            ⏸️ Deactivate
          </button>
          <button
            onClick={() => handleStatusUpdate('blacklisted')}
            className={`${styles.bulkActionButton} ${styles.bulkActionDanger}`}
            disabled={loading}
            title="Blacklist selected websites"
          >
            🚫 Blacklist
          </button>
        </div>

        {/* Update Actions */}
        <div className={styles.bulkActionGroup}>
          <span className={styles.bulkActionGroupLabel}>Update:</span>
          <button
            onClick={handleCategoryUpdate}
            className={styles.bulkActionButton}
            disabled={loading}
            title="Update category for selected websites"
          >
            📂 Category
          </button>
        </div>

        {/* Export Actions */}
        <div className={styles.bulkActionGroup}>
          <span className={styles.bulkActionGroupLabel}>Export:</span>
          <button
            onClick={() => handleExport('csv')}
            className={styles.bulkActionButton}
            disabled={loading}
            title="Export selected websites as CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className={styles.bulkActionButton}
            disabled={loading}
            title="Export selected websites as JSON"
          >
            📄 JSON
          </button>
        </div>

        {/* Destructive Actions */}
        <div className={styles.bulkActionGroup}>
          <button
            onClick={() => confirmAction('delete', `Are you sure you want to permanently delete ${selectedCount} website${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`)}
            className={`${styles.bulkActionButton} ${styles.bulkActionDanger}`}
            disabled={loading}
            title="Delete selected websites permanently"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.bulkActionsLoading}>
          <div className={styles.bulkLoadingSpinner}>⏳</div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

export default BulkActionsBar;
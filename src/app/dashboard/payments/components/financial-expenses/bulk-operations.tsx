'use client';

import { useState } from 'react';
import styles from './bulk-operations.module.css';

interface BulkOperationsProps {
  selectedItems: string[];
  onSelectAll: (selectAll: boolean) => void;
  onClearSelection: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkUpdateStatus?: (ids: string[], status: string) => Promise<void>;
  onBulkExport: (ids: string[]) => void;
  totalItems: number;
  itemType: 'expense' | 'utility_bill';
}

const STATUS_OPTIONS = {
  expense: [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ],
  utility_bill: [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ]
};

export function BulkOperations({
  selectedItems,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkUpdateStatus,
  onBulkExport,
  totalItems,
  itemType
}: BulkOperationsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;

  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };

  const handleBulkDelete = async () => {
    try {
      setIsLoading(true);
      await onBulkDelete(selectedItems);
      setShowDeleteConfirm(false);
      onClearSelection();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete selected items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!onBulkUpdateStatus) return;
    
    try {
      setIsLoading(true);
      await onBulkUpdateStatus(selectedItems, status);
      setShowStatusMenu(false);
      onClearSelection();
    } catch (error) {
      console.error('Bulk status update failed:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = () => {
    onBulkExport(selectedItems);
    onClearSelection();
  };

  if (selectedCount === 0) return null;

  return (
    <div className={styles.bulkOperations}>
      <div className={styles.selectionInfo}>
        <div className={styles.checkbox}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            disabled={isLoading}
          />
        </div>
        <span className={styles.selectionText}>
          {selectedCount} of {totalItems} selected
        </span>
        <button
          className={styles.clearButton}
          onClick={onClearSelection}
          disabled={isLoading}
        >
          Clear Selection
        </button>
      </div>

      <div className={styles.bulkActions}>
        {/* Status Update */}
        {onBulkUpdateStatus && (
          <div className={styles.actionGroup}>
            <button
              className={styles.actionButton}
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={isLoading}
            >
              📝 Update Status
              <span className={styles.chevron}>{showStatusMenu ? '▲' : '▼'}</span>
            </button>
            {showStatusMenu && (
              <div className={styles.statusMenu}>
                {STATUS_OPTIONS[itemType].map(option => (
                  <button
                    key={option.value}
                    className={styles.statusOption}
                    onClick={() => handleStatusUpdate(option.value)}
                    disabled={isLoading}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Export */}
        <button
          className={styles.actionButton}
          onClick={handleBulkExport}
          disabled={isLoading}
        >
          📥 Export Selected
        </button>

        {/* Delete */}
        <div className={styles.actionGroup}>
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
          >
            🗑️ Delete Selected
          </button>
          {showDeleteConfirm && (
            <div className={styles.deleteConfirm}>
              <p>Delete {selectedCount} selected items?</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmButton}
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
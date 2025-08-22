'use client';

import React, { useState, useEffect } from 'react';
import { InventoryFilters as FilterType } from '@/types/inventory';
import inventoryApi from '@/lib/inventory-api';
import styles from './inventory-components.module.css';

interface InventoryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onClose: () => void;
  onClear: () => void;
  loading?: boolean;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
  onClear,
  loading = false
}) => {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);
  const [categories, setCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [categoriesData, contactsData] = await Promise.all([
          inventoryApi.getCategories(),
          inventoryApi.getContacts()
        ]);
        setCategories(categoriesData);
        setContacts(contactsData);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  // Update local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setLocalFilters({});
    onClear();
  };

  // Reset to current applied filters
  const resetFilters = () => {
    setLocalFilters(filters);
  };

  // Check if filters have been modified
  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);

  // Count active filters
  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FilterType];
    return value !== null && value !== undefined && value !== '';
  }).length;

  return (
    <div className={styles.filtersOverlay}>
      <div className={styles.filtersPanel}>
        <div className={styles.filtersHeader}>
          <div>
            <h3 className={styles.filtersTitle}>Advanced Filters</h3>
            {activeFiltersCount > 0 && (
              <p className={styles.filtersSubtitle}>
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            title="Close filters"
          >
            ✕
          </button>
        </div>

        <div className={styles.filtersContent}>
          {/* Search */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🔍 Search</h4>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Global Search</label>
              <input
                type="text"
                value={localFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search websites, contacts, categories..."
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Website</label>
                <input
                  type="text"
                  value={localFilters.website || ''}
                  onChange={(e) => handleFilterChange('website', e.target.value)}
                  placeholder="example.com"
                  className={styles.filterInput}
                />
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Contact</label>
                <select
                  value={localFilters.contact || ''}
                  onChange={(e) => handleFilterChange('contact', e.target.value)}
                  className={styles.filterSelect}
                  disabled={loadingOptions}
                >
                  <option value="">All Contacts</option>
                  {contacts.map(contact => (
                    <option key={contact} value={contact}>{contact}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Authority Metrics */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>📊 Authority Metrics</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Domain Rating (DR)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.domain_rating_min || ''}
                    onChange={(e) => handleFilterChange('domain_rating_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    max="100"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.domain_rating_max || ''}
                    onChange={(e) => handleFilterChange('domain_rating_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    max="100"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Domain Authority (DA)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.da_min || ''}
                    onChange={(e) => handleFilterChange('da_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    max="100"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.da_max || ''}
                    onChange={(e) => handleFilterChange('da_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    max="100"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Backlinks</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={localFilters.backlinks_min || ''}
                  onChange={(e) => handleFilterChange('backlinks_min', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Min backlinks"
                  min="0"
                  className={styles.rangeInput}
                />
                <span>to</span>
                <input
                  type="number"
                  value={localFilters.backlinks_max || ''}
                  onChange={(e) => handleFilterChange('backlinks_max', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Max backlinks"
                  min="0"
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>

          {/* Traffic Metrics */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🚀 Traffic Metrics</h4>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organic Traffic</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={localFilters.organic_traffic_min || ''}
                  onChange={(e) => handleFilterChange('organic_traffic_min', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Min traffic"
                  min="0"
                  className={styles.rangeInput}
                />
                <span>to</span>
                <input
                  type="number"
                  value={localFilters.organic_traffic_max || ''}
                  onChange={(e) => handleFilterChange('organic_traffic_max', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Max traffic"
                  min="0"
                  className={styles.rangeInput}
                />
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>US Traffic</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.us_traffic_min || ''}
                    onChange={(e) => handleFilterChange('us_traffic_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.us_traffic_max || ''}
                    onChange={(e) => handleFilterChange('us_traffic_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>UK Traffic</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.uk_traffic_min || ''}
                    onChange={(e) => handleFilterChange('uk_traffic_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.uk_traffic_max || ''}
                    onChange={(e) => handleFilterChange('uk_traffic_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Canada Traffic</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={localFilters.canada_traffic_min || ''}
                  onChange={(e) => handleFilterChange('canada_traffic_min', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Min traffic"
                  min="0"
                  className={styles.rangeInput}
                />
                <span>to</span>
                <input
                  type="number"
                  value={localFilters.canada_traffic_max || ''}
                  onChange={(e) => handleFilterChange('canada_traffic_max', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Max traffic"
                  min="0"
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>💰 Pricing</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Client Price ($)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.client_price_min || ''}
                    onChange={(e) => handleFilterChange('client_price_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    step="100"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.client_price_max || ''}
                    onChange={(e) => handleFilterChange('client_price_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    step="100"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Our Price ($)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={localFilters.price_min || ''}
                    onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    min="0"
                    step="100"
                    className={styles.rangeInput}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={localFilters.price_max || ''}
                    onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    min="0"
                    step="100"
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content & AI Flags */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🤖 AI & Content Flags</h4>
            <div className={styles.checkboxGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Index Status</label>
                <select
                  value={localFilters.is_indexed?.toString() || ''}
                  onChange={(e) => handleFilterChange('is_indexed', e.target.value === '' ? null : e.target.value === 'true')}
                  className={styles.filterSelect}
                >
                  <option value="">All</option>
                  <option value="true">Indexed</option>
                  <option value="false">Not Indexed</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Do Follow</label>
                <select
                  value={localFilters.do_follow?.toString() || ''}
                  onChange={(e) => handleFilterChange('do_follow', e.target.value === '' ? null : e.target.value === 'true')}
                  className={styles.filterSelect}
                >
                  <option value="">All</option>
                  <option value="true">Do Follow</option>
                  <option value="false">No Follow</option>
                </select>
              </div>
            </div>
            <div className={styles.checkboxGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.ai_overview || false}
                  onChange={(e) => handleFilterChange('ai_overview', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                AI Overview
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.chatgpt || false}
                  onChange={(e) => handleFilterChange('chatgpt', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                ChatGPT
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.perplexity || false}
                  onChange={(e) => handleFilterChange('perplexity', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Perplexity
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.gemini || false}
                  onChange={(e) => handleFilterChange('gemini', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Gemini
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.copilot || false}
                  onChange={(e) => handleFilterChange('copilot', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Copilot
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.news || false}
                  onChange={(e) => handleFilterChange('news', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                News
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.sponsored || false}
                  onChange={(e) => handleFilterChange('sponsored', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Sponsored
              </label>
            </div>
          </div>

          {/* Niche Filters */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>⚠️ Niche Content</h4>
            <div className={styles.checkboxGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.cbd || false}
                  onChange={(e) => handleFilterChange('cbd', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                CBD
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.casino || false}
                  onChange={(e) => handleFilterChange('casino', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Casino
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.dating || false}
                  onChange={(e) => handleFilterChange('dating', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Dating
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={localFilters.crypto || false}
                  onChange={(e) => handleFilterChange('crypto', e.target.checked ? true : null)}
                  className={styles.checkbox}
                />
                Crypto
              </label>
            </div>
          </div>

          {/* Category & Status */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>📂 Category & Status</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Category</label>
                <select
                  value={localFilters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className={styles.filterSelect}
                  disabled={loadingOptions}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Status</label>
                <select
                  value={localFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>TAT (Turnaround Time - Days)</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={localFilters.tat_min || ''}
                  onChange={(e) => handleFilterChange('tat_min', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Min days"
                  min="0"
                  max="30"
                  className={styles.rangeInput}
                />
                <span>to</span>
                <input
                  type="number"
                  value={localFilters.tat_max || ''}
                  onChange={(e) => handleFilterChange('tat_max', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Max days"
                  min="0"
                  max="30"
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Actions */}
        <div className={styles.filtersActions}>
          <div className={styles.filterActionsLeft}>
            <button
              onClick={clearAllFilters}
              className={styles.clearButton}
              disabled={loading}
            >
              🗑️ Clear All
            </button>
            <button
              onClick={resetFilters}
              className={styles.resetButton}
              disabled={loading || !hasChanges}
            >
              ↺ Reset
            </button>
          </div>
          <div className={styles.filterActionsRight}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={applyFilters}
              className={`${styles.applyButton} ${hasChanges ? styles.hasChanges : ''}`}
              disabled={loading}
            >
              {loading ? 'Applying...' : hasChanges ? 'Apply Changes' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters;
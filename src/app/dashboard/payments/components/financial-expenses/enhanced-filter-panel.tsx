'use client';

import { useState, useEffect } from 'react';
import { ExpenseCategory, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getExpenseCategories, getPaymentMethods } from '@/lib/finance-api';
import styles from './enhanced-filter-panel.module.css';

interface FilterState {
  search: string;
  category_id: string;
  person_paid: string;
  person_responsible: string;
  payment_method_id: string;
  payment_status: string;
  date_from: string;
  date_to: string;
  bill_type: string;
  provider_name: string;
}

interface EnhancedFilterPanelProps {
  onFilterChange: (filters: Partial<FilterState>) => void;
  onExport: () => void;
  onToggleAnalytics: () => void;
  showAnalytics: boolean;
  totalResults: number;
}

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' }
];

const BILL_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'internet', label: 'Internet' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' }
];

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' }
];

export function EnhancedFilterPanel({ 
  onFilterChange, 
  onExport, 
  onToggleAnalytics, 
  showAnalytics, 
  totalResults 
}: EnhancedFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category_id: '',
    person_paid: '',
    person_responsible: '',
    payment_method_id: '',
    payment_status: '',
    date_from: '',
    date_to: '',
    bill_type: '',
    provider_name: ''
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadFilterData();
    setDefaultDateFilter();
  }, []);

  const loadFilterData = async () => {
    try {
      const [categoriesData, paymentMethodsData] = await Promise.all([
        getExpenseCategories(),
        getPaymentMethods()
      ]);
      setCategories(categoriesData);
      setPaymentMethods(paymentMethodsData);
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  const setDefaultDateFilter = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const newFilters = {
      ...filters,
      date_from: firstDay.toISOString().split('T')[0],
      date_to: lastDay.toISOString().split('T')[0]
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setShowCustomDates(preset === 'custom');
    
    const now = new Date();
    let dateFrom = '';
    let dateTo = '';

    switch (preset) {
      case 'today':
        dateFrom = dateTo = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateFrom = weekStart.toISOString().split('T')[0];
        dateTo = weekEnd.toISOString().split('T')[0];
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        dateFrom = quarterStart.toISOString().split('T')[0];
        dateTo = quarterEnd.toISOString().split('T')[0];
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'custom':
        return; // Don't update dates for custom
    }

    if (preset !== 'custom') {
      const newFilters = { ...filters, date_from: dateFrom, date_to: dateTo };
      setFilters(newFilters);
      onFilterChange(newFilters);
    }
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      category_id: '',
      person_paid: '',
      person_responsible: '',
      payment_method_id: '',
      payment_status: '',
      date_from: '',
      date_to: '',
      bill_type: '',
      provider_name: ''
    };
    setFilters(clearedFilters);
    setDatePreset('');
    setShowCustomDates(false);
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  return (
    <div className={styles.filterPanel}>
      {/* Simple Horizontal Filter Bar */}
      <div className={styles.horizontalFilterBar}>
        <div className={styles.filterContainer}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
            className={styles.simpleSelect}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={filters.payment_status}
            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
            className={styles.simpleSelect}
          >
            {PAYMENT_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className={styles.dateInput}
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className={styles.dateInput}
          />

          <button
            className={`${styles.advancedToggle} ${isExpanded ? styles.active : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            Advanced
            <span className={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>

        <div className={styles.actionButtons}>
          <button
            className={`${styles.simpleButton} ${showAnalytics ? styles.active : ''}`}
            onClick={onToggleAnalytics}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {isExpanded && (
        <div className={styles.advancedFilters}>
          <div className={styles.filterRow}>
            <select
              value={filters.person_paid}
              onChange={(e) => handleFilterChange('person_paid', e.target.value)}
              className={styles.simpleSelect}
            >
              <option value="">All People</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
              <option value="Office">Office</option>
            </select>

            <select
              value={filters.payment_method_id}
              onChange={(e) => handleFilterChange('payment_method_id', e.target.value)}
              className={styles.simpleSelect}
            >
              <option value="">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>

            <select
              value={filters.bill_type}
              onChange={(e) => handleFilterChange('bill_type', e.target.value)}
              className={styles.simpleSelect}
            >
              {BILL_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {showCustomDates && (
              <>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className={styles.dateInput}
                />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className={styles.dateInput}
                />
              </>
            )}

            <button className={styles.clearButton} onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
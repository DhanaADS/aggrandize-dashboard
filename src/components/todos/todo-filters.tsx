'use client';

import { useState } from 'react';
import { TodoFilters as Filters, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/todos';
import styles from './todo-filters.module.css';

interface TodoFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function TodoFilters({ filters, onFilterChange }: TodoFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof Filters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;
  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && 
    value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filterHeader}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.toggleButton}
        >
          🔍 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>
            ⌄
          </span>
        </button>
        
        {hasActiveFilters && (
          <button onClick={clearFilters} className={styles.clearButton}>
            ✕ Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className={styles.filterPanel}>
          <div className={styles.filterRow}>
            {/* Search */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value || undefined)}
                placeholder="Search titles and descriptions..."
                className={styles.searchInput}
              />
            </div>

            {/* Date Range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Due Date</label>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  value={filters.due_date_from?.split('T')[0] || ''}
                  onChange={(e) => updateFilter('due_date_from', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className={styles.dateInput}
                  placeholder="From"
                />
                <span className={styles.dateSeparator}>to</span>
                <input
                  type="date"
                  value={filters.due_date_to?.split('T')[0] || ''}
                  onChange={(e) => updateFilter('due_date_to', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className={styles.dateInput}
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            {/* Status */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <div className={styles.chipContainer}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const currentStatus = filters.status || [];
                      const newStatus = currentStatus.includes(key as any)
                        ? currentStatus.filter(s => s !== key)
                        : [...currentStatus, key as any];
                      updateFilter('status', newStatus.length > 0 ? newStatus : undefined);
                    }}
                    className={`${styles.chip} ${filters.status?.includes(key as any) ? styles.chipActive : ''}`}
                    style={{ borderColor: config.color }}
                  >
                    {config.icon} {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Priority</label>
              <div className={styles.chipContainer}>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const currentPriority = filters.priority || [];
                      const newPriority = currentPriority.includes(key as any)
                        ? currentPriority.filter(p => p !== key)
                        : [...currentPriority, key as any];
                      updateFilter('priority', newPriority.length > 0 ? newPriority : undefined);
                    }}
                    className={`${styles.chip} ${filters.priority?.includes(key as any) ? styles.chipActive : ''}`}
                    style={{ borderColor: config.color }}
                  >
                    {config.icon} {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            {/* Category */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Category</label>
              <div className={styles.chipContainer}>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const currentCategory = filters.category || [];
                      const newCategory = currentCategory.includes(key as any)
                        ? currentCategory.filter(c => c !== key)
                        : [...currentCategory, key as any];
                      updateFilter('category', newCategory.length > 0 ? newCategory : undefined);
                    }}
                    className={`${styles.chip} ${filters.category?.includes(key as any) ? styles.chipActive : ''}`}
                    style={{ borderColor: config.color }}
                  >
                    {config.icon} {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned To */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Assigned To</label>
              <div className={styles.chipContainer}>
                {[
                  { email: 'dhana@aggrandizedigital.com', name: 'Dhana', icon: '👑' },
                  { email: 'veera@aggrandizedigital.com', name: 'Veera', icon: '📢' },
                  { email: 'saravana@aggrandizedigital.com', name: 'Saravana', icon: '📢' },
                  { email: 'saran@aggrandizedigital.com', name: 'Saran', icon: '📢' },
                  { email: 'abbas@aggrandizedigital.com', name: 'Abbas', icon: '⚙️' },
                  { email: 'gokul@aggrandizedigital.com', name: 'Gokul', icon: '⚙️' }
                ].map((member) => (
                  <button
                    key={member.email}
                    onClick={() => {
                      const currentAssigned = filters.assigned_to || [];
                      const newAssigned = currentAssigned.includes(member.email)
                        ? currentAssigned.filter(email => email !== member.email)
                        : [...currentAssigned, member.email];
                      updateFilter('assigned_to', newAssigned.length > 0 ? newAssigned : undefined);
                    }}
                    className={`${styles.chip} ${filters.assigned_to?.includes(member.email) ? styles.chipActive : ''}`}
                  >
                    {member.icon} {member.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            {/* Team Todo Toggle */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Type</label>
              <div className={styles.toggleContainer}>
                <button
                  onClick={() => updateFilter('is_team_todo', filters.is_team_todo === true ? undefined : true)}
                  className={`${styles.toggleChip} ${filters.is_team_todo === true ? styles.chipActive : ''}`}
                >
                  👥 Team Todos Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
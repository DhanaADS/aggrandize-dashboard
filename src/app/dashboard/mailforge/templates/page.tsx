'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './templates.module.css';

interface Template {
  id: string;
  name: string;
  description?: string;
  subject: string;
  content: string;
  category: string;
  is_public: boolean;
  usage_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TemplateStats {
  totalTemplates: number;
  publicTemplates: number;
  totalUsage: number;
  avgUsage: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<TemplateStats>({
    totalTemplates: 0,
    publicTemplates: 0,
    totalUsage: 0,
    avgUsage: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'promotion', label: 'Promotion' },
    { value: 'general', label: 'General' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, [filter, categoryFilter, search, sortBy, sortOrder]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        search,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/mailforge/templates?${params}`);
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data);
        
        // Calculate stats
        const totalTemplates = result.data.length;
        const publicTemplates = result.data.filter((t: Template) => t.is_public).length;
        const totalUsage = result.data.reduce((sum: number, t: Template) => sum + t.usage_count, 0);
        
        setStats({
          totalTemplates,
          publicTemplates,
          totalUsage,
          avgUsage: totalTemplates > 0 ? Math.round(totalUsage / totalTemplates) : 0
        });
      } else {
        console.error('Failed to fetch templates:', result.error);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplates(prev => 
      prev.length === templates.length ? [] : templates.map(t => t.id)
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTemplates.length === 0) return;
    
    if (!confirm(`Delete ${selectedTemplates.length} template(s)?`)) return;

    try {
      const response = await fetch(`/api/mailforge/templates?ids=${selectedTemplates.join(',')}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSelectedTemplates([]);
        fetchTemplates();
      } else {
        alert('Failed to delete templates: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting templates:', error);
      alert('Failed to delete templates');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'welcome': return '👋';
      case 'follow-up': return '📞';
      case 'outreach': return '🎯';
      case 'newsletter': return '📰';
      case 'promotion': return '🎉';
      default: return '📧';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            onClick={() => router.push('/dashboard/mailforge')}
            className={styles.backButton}
          >
            ← Back to MailForge
          </button>
          <div>
            <h1 className={styles.title}>Email Templates</h1>
            <p className={styles.subtitle}>Manage your email templates and explore public ones</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={() => router.push('/dashboard/mailforge/templates/create')}
            className={styles.createButton}
          >
            <span className={styles.buttonIcon}>✨</span>
            Create Template
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📄</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalTemplates}</div>
            <div className={styles.statLabel}>Total Templates</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🌍</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.publicTemplates}</div>
            <div className={styles.statLabel}>Public Templates</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalUsage}</div>
            <div className={styles.statLabel}>Total Usage</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.avgUsage}</div>
            <div className={styles.statLabel}>Avg Usage</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.controlsRight}>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className={styles.sortSelect}
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="usage_count-desc">Most Used</option>
            <option value="usage_count-asc">Least Used</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTemplates.length > 0 && (
        <div className={styles.bulkActions}>
          <div className={styles.bulkInfo}>
            {selectedTemplates.length} template(s) selected
          </div>
          <div className={styles.bulkButtons}>
            <button onClick={handleSelectAll} className={styles.bulkButton}>
              {selectedTemplates.length === templates.length ? 'Deselect All' : 'Select All'}
            </button>
            <button onClick={handleDeleteSelected} className={styles.deleteButton}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className={styles.templatesList}>
        {templates.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>
            <h3 className={styles.emptyTitle}>No templates found</h3>
            <p className={styles.emptyDescription}>
              Create your first email template to get started with campaigns
            </p>
            <button 
              onClick={() => router.push('/dashboard/mailforge/templates/create')}
              className={styles.emptyButton}
            >
              Create First Template
            </button>
          </div>
        ) : (
          <div className={styles.templatesGrid}>
            {templates.map((template) => (
              <div key={template.id} className={styles.templateCard}>
                <div className={styles.templateHeader}>
                  <div className={styles.templateSelectRow}>
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateToggle(template.id)}
                      className={styles.templateCheckbox}
                    />
                    <div className={styles.templateCategory}>
                      <span className={styles.categoryIcon}>{getCategoryIcon(template.category)}</span>
                      <span className={styles.categoryText}>{template.category}</span>
                    </div>
                    {template.is_public && (
                      <div className={styles.publicBadge}>Public</div>
                    )}
                  </div>
                  
                  <h3 className={styles.templateName}>{template.name}</h3>
                  {template.description && (
                    <p className={styles.templateDescription}>{template.description}</p>
                  )}
                </div>

                <div className={styles.templateContent}>
                  <div className={styles.templateSubject}>
                    <strong>Subject:</strong> {template.subject}
                  </div>
                  <div className={styles.templatePreview}>
                    {truncateContent(template.content)}
                  </div>
                </div>

                <div className={styles.templateFooter}>
                  <div className={styles.templateMeta}>
                    <div className={styles.usageCount}>
                      Used {template.usage_count} times
                    </div>
                    <div className={styles.templateDate}>
                      Created {formatDate(template.created_at)}
                    </div>
                  </div>
                  
                  <div className={styles.templateActions}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => router.push(`/dashboard/mailforge/templates/${template.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => {
                        // Use template in new campaign
                        router.push(`/dashboard/mailforge/campaigns/create?template=${template.id}`);
                      }}
                    >
                      Use
                    </button>
                    <button 
                      className={styles.primaryActionButton}
                      onClick={() => router.push(`/dashboard/mailforge/templates/${template.id}/edit`)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
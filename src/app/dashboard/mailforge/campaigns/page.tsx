'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './campaigns.module.css';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
  updated_at: string;
}

interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    totalSent: 0,
    avgOpenRate: 0,
    avgClickRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCampaigns();
  }, [filter, search, sortBy, sortOrder]);

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams({
        filter,
        search,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/mailforge/campaigns?${params}`);
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data);
        setStats(result.stats);
      } else {
        console.error('Failed to fetch campaigns:', result.error);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6b7280';
      case 'scheduled': return '#3b82f6';
      case 'sending': return '#f59e0b';
      case 'sent': return '#10b981';
      case 'paused': return '#f97316';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'scheduled': return '⏰';
      case 'sending': return '📤';
      case 'sent': return '✅';
      case 'paused': return '⏸️';
      case 'cancelled': return '❌';
      default: return '📧';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateRate = (numerator: number, denominator: number) => {
    return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading campaigns...</p>
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
            <h1 className={styles.title}>Email Campaigns</h1>
            <p className={styles.subtitle}>Manage your email marketing campaigns</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={() => router.push('/dashboard/mailforge/campaigns/create')}
            className={styles.createButton}
          >
            <span className={styles.buttonIcon}>✨</span>
            Create Campaign
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalCampaigns}</div>
            <div className={styles.statLabel}>Total Campaigns</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📧</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalSent.toLocaleString()}</div>
            <div className={styles.statLabel}>Emails Sent</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👁️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.avgOpenRate}%</div>
            <div className={styles.statLabel}>Avg Open Rate</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👆</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.avgClickRate}%</div>
            <div className={styles.statLabel}>Avg Click Rate</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Campaigns</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
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
            <option value="sent_count-desc">Most Sent</option>
            <option value="open_count-desc">Most Opens</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      <div className={styles.campaignsList}>
        {campaigns.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📧</div>
            <h3 className={styles.emptyTitle}>No campaigns yet</h3>
            <p className={styles.emptyDescription}>
              Create your first email campaign to start engaging with your contacts
            </p>
            <button 
              onClick={() => router.push('/dashboard/mailforge/campaigns/create')}
              className={styles.emptyButton}
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className={styles.campaignCard}>
                <div className={styles.campaignHeader}>
                  <div className={styles.campaignTitleRow}>
                    <h3 className={styles.campaignName}>{campaign.name}</h3>
                    <div 
                      className={styles.campaignStatus}
                      style={{ backgroundColor: getStatusColor(campaign.status) }}
                    >
                      <span className={styles.statusIcon}>{getStatusIcon(campaign.status)}</span>
                      <span className={styles.statusText}>{campaign.status}</span>
                    </div>
                  </div>
                  <p className={styles.campaignSubject}>{campaign.subject}</p>
                </div>

                <div className={styles.campaignStats}>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Recipients:</span>
                    <span className={styles.statValue}>{campaign.recipient_count.toLocaleString()}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Sent:</span>
                    <span className={styles.statValue}>{campaign.sent_count.toLocaleString()}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Open Rate:</span>
                    <span className={styles.statValue}>
                      {calculateRate(campaign.open_count, campaign.sent_count)}%
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Click Rate:</span>
                    <span className={styles.statValue}>
                      {calculateRate(campaign.click_count, campaign.sent_count)}%
                    </span>
                  </div>
                </div>

                <div className={styles.campaignFooter}>
                  <div className={styles.campaignDates}>
                    <div className={styles.dateRow}>
                      <span className={styles.dateLabel}>Created:</span>
                      <span className={styles.dateValue}>{formatDate(campaign.created_at)}</span>
                    </div>
                    {campaign.sent_at && (
                      <div className={styles.dateRow}>
                        <span className={styles.dateLabel}>Sent:</span>
                        <span className={styles.dateValue}>{formatDate(campaign.sent_at)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.campaignActions}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => router.push(`/dashboard/mailforge/campaigns/${campaign.id}`)}
                    >
                      View Details
                    </button>
                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                      <button 
                        className={styles.sendActionButton}
                        onClick={() => router.push(`/dashboard/mailforge/campaigns/${campaign.id}`)}
                      >
                        Send Campaign
                      </button>
                    )}
                    {campaign.status === 'draft' && (
                      <button 
                        className={styles.primaryActionButton}
                        onClick={() => router.push(`/dashboard/mailforge/campaigns/${campaign.id}/edit`)}
                      >
                        Edit
                      </button>
                    )}
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
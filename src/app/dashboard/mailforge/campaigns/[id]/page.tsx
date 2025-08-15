'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './campaign-details.module.css';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
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

interface Recipient {
  id: string;
  contact_id: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  error_message?: string;
  contact: {
    name: string;
    email: string;
    niche?: string;
  };
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'content'>('overview');

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails();
      fetchRecipients();
    }
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`/api/mailforge/campaigns?filter=all&limit=1000`);
      const result = await response.json();
      
      if (result.success) {
        const foundCampaign = result.data.find((c: Campaign) => c.id === campaignId);
        if (foundCampaign) {
          setCampaign(foundCampaign);
        }
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      // Since we don't have a specific recipients API, we'll simulate this
      // In a real implementation, you'd create /api/mailforge/campaigns/[id]/recipients
      setRecipients([]);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaign || sending) return;
    
    if (!confirm(`Send campaign "${campaign.name}" to ${campaign.recipient_count} recipients?`)) {
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch(`/api/mailforge/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sendNow: true })
      });

      if (response.status === 401) {
        alert('Authentication required. Please refresh the page and try again.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Send campaign error:', response.status, errorText);
        
        if (errorText.includes('<!DOCTYPE')) {
          alert('Authentication error. Please refresh the page and try again.');
        } else {
          alert(`Failed to send campaign (${response.status}): ${errorText}`);
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        alert(`Campaign sent successfully! ${result.results.totalSent} emails sent, ${result.results.totalFailed} failed.`);
        fetchCampaignDetails(); // Refresh campaign status
      } else {
        alert(`Failed to send campaign: ${result.error}\n${result.details || ''}`);
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!campaign || !testEmail || sendingTest) return;

    setSendingTest(true);
    
    try {
      const response = await fetch(`/api/mailforge/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testEmail })
      });

      if (response.status === 401) {
        alert('Authentication required. Please refresh the page and try again.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Send test email error:', response.status, errorText);
        
        if (errorText.includes('<!DOCTYPE')) {
          alert('Authentication error. Please refresh the page and try again.');
        } else {
          alert(`Failed to send test email (${response.status}): ${errorText}`);
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        alert(`Test email sent successfully to ${testEmail}!`);
        setTestEmail('');
      } else {
        alert(`Failed to send test email: ${result.error}\n${result.details || ''}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    } finally {
      setSendingTest(false);
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
      case 'failed': return '#ef4444';
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
      case 'failed': return '❌';
      default: return '📧';
    }
  };

  const calculateRate = (numerator: number, denominator: number) => {
    return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : '0.0';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Campaign Not Found</h2>
          <p>The requested campaign could not be found.</p>
          <button onClick={() => router.push('/dashboard/mailforge/campaigns')} className={styles.backButton}>
            ← Back to Campaigns
          </button>
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
            onClick={() => router.push('/dashboard/mailforge/campaigns')}
            className={styles.backButton}
          >
            ← Back to Campaigns
          </button>
          <div className={styles.campaignInfo}>
            <div className={styles.campaignTitle}>
              <h1 className={styles.title}>{campaign.name}</h1>
              <div 
                className={styles.status}
                style={{ backgroundColor: getStatusColor(campaign.status) }}
              >
                <span className={styles.statusIcon}>{getStatusIcon(campaign.status)}</span>
                <span className={styles.statusText}>{campaign.status}</span>
              </div>
            </div>
            <p className={styles.subject}>{campaign.subject}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <div className={styles.actionButtons}>
              <div className={styles.testEmailGroup}>
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={styles.testEmailInput}
                />
                <button 
                  onClick={handleSendTest}
                  disabled={!testEmail || sendingTest}
                  className={styles.testButton}
                >
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              <button 
                onClick={handleSendCampaign}
                disabled={sending}
                className={styles.sendButton}
              >
                {sending ? 'Sending...' : `Send to ${campaign.recipient_count} Recipients`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{campaign.recipient_count}</div>
            <div className={styles.statLabel}>Recipients</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📧</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{campaign.sent_count}</div>
            <div className={styles.statLabel}>Sent</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👁️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{calculateRate(campaign.open_count, campaign.sent_count)}%</div>
            <div className={styles.statLabel}>Open Rate</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👆</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{calculateRate(campaign.click_count, campaign.sent_count)}%</div>
            <div className={styles.statLabel}>Click Rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'recipients' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('recipients')}
        >
          Recipients ({campaign.recipient_count})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'content' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Email Content
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overview}>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3 className={styles.cardTitle}>Campaign Details</h3>
                <div className={styles.detailsList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Created:</span>
                    <span className={styles.detailValue}>{formatDate(campaign.created_at)}</span>
                  </div>
                  {campaign.sent_at && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Sent:</span>
                      <span className={styles.detailValue}>{formatDate(campaign.sent_at)}</span>
                    </div>
                  )}
                  {campaign.scheduled_at && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Scheduled:</span>
                      <span className={styles.detailValue}>{formatDate(campaign.scheduled_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.overviewCard}>
                <h3 className={styles.cardTitle}>Performance Metrics</h3>
                <div className={styles.metricsList}>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Delivery Rate:</span>
                    <span className={styles.metricValue}>
                      {calculateRate(campaign.sent_count - campaign.bounce_count, campaign.sent_count)}%
                    </span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Opens:</span>
                    <span className={styles.metricValue}>{campaign.open_count}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Clicks:</span>
                    <span className={styles.metricValue}>{campaign.click_count}</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Bounces:</span>
                    <span className={styles.metricValue}>{campaign.bounce_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className={styles.recipients}>
            <div className={styles.recipientsHeader}>
              <h3>Campaign Recipients</h3>
              <p>Recipients list and delivery status will be shown here after sending</p>
            </div>
            {/* Recipients list would go here - implement based on your needs */}
            <div className={styles.comingSoon}>
              <div className={styles.comingSoonIcon}>👥</div>
              <h4>Recipients Tracking</h4>
              <p>Detailed recipient status and engagement tracking coming soon!</p>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className={styles.content}>
            <div className={styles.emailPreview}>
              <div className={styles.previewHeader}>
                <h3>Email Preview</h3>
                <div className={styles.previewSubject}>
                  <strong>Subject:</strong> {campaign.subject}
                </div>
              </div>
              <div className={styles.previewContent}>
                <div 
                  className={styles.emailBody}
                  dangerouslySetInnerHTML={{ __html: campaign.content }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './mailforge.module.css';

interface DashboardStats {
  totalCampaigns: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  activeContacts: number;
  automations: number;
}

export default function MailForgePage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0,
    activeContacts: 0,
    automations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch campaigns data
      const campaignsResponse = await fetch('/api/mailforge/campaigns?limit=1000');
      const campaignsResult = await campaignsResponse.json();
      
      // Fetch contacts data
      const contactsResponse = await fetch('/api/mailforge/contacts?limit=1000');
      const contactsResult = await contactsResponse.json();

      if (campaignsResult.success && contactsResult.success) {
        const campaigns = campaignsResult.data || [];
        const contacts = contactsResult.data || [];

        // Calculate stats
        const totalCampaigns = campaigns.length;
        const emailsSent = campaigns.reduce((sum: number, campaign: any) => sum + (campaign.sent_count || 0), 0);
        const totalOpens = campaigns.reduce((sum: number, campaign: any) => sum + (campaign.open_count || 0), 0);
        const totalClicks = campaigns.reduce((sum: number, campaign: any) => sum + (campaign.click_count || 0), 0);
        
        const openRate = emailsSent > 0 ? ((totalOpens / emailsSent) * 100) : 0;
        const clickRate = emailsSent > 0 ? ((totalClicks / emailsSent) * 100) : 0;

        setStats({
          totalCampaigns,
          emailsSent,
          openRate: Math.round(openRate * 10) / 10,
          clickRate: Math.round(clickRate * 10) / 10,
          activeContacts: contacts.length,
          automations: 0 // Will implement later
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: '📧',
      title: 'Bulk Email',
      description: 'Send thousands of personalized emails with smart delivery optimization',
      color: '#00ff88'
    },
    {
      icon: '🤖',
      title: 'AI Writing',
      description: 'Generate compelling email content with AI-powered writing assistant',
      color: '#00d4ff'
    },
    {
      icon: '📊',
      title: 'Analytics',
      description: 'Track opens, clicks, and engagement with detailed performance insights',
      color: '#ff6b6b'
    },
    {
      icon: '📄',
      title: 'Templates',
      description: 'Professional email templates for every campaign type and industry',
      color: '#ffd93d'
    },
    {
      icon: '🎯',
      title: 'Smart Targeting',
      description: 'Advanced segmentation and targeting based on user behavior and data',
      color: '#a78bfa'
    },
    {
      icon: '⚡',
      title: 'Automation',
      description: 'Set up automated follow-up sequences and drip campaigns',
      color: '#34d399'
    }
  ];

  const quickActions = [
    { title: 'Create Campaign', icon: '✨', description: 'Start a new email campaign', path: '/dashboard/mailforge/campaigns' },
    { title: 'Import Contacts', icon: '📥', description: 'Upload your contact list', path: '/dashboard/mailforge/import' },
    { title: 'Manage Contacts', icon: '👥', description: 'View and organize contacts', path: '/dashboard/mailforge/contacts' },
    { title: 'Browse Templates', icon: '🎨', description: 'Explore email templates', path: '/dashboard/mailforge/templates' }
  ];

  const recentActivity = [
    { action: 'Welcome to MailForge!', time: 'Just now', type: 'system' },
    { action: 'Database connected successfully', time: '1 min ago', type: 'system' },
    { action: 'Contact import ready', time: '2 min ago', type: 'system' }
  ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>🔥</span>
              Welcome to MailForge
            </h1>
            <p className={styles.subtitle}>
              AI-Powered Email Management & Automation Platform
            </p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalCampaigns}</div>
              <div className={styles.statLabel}>Campaigns</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.emailsSent.toLocaleString()}</div>
              <div className={styles.statLabel}>Emails Sent</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.openRate}%</div>
              <div className={styles.statLabel}>Open Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Powerful Features</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <div 
                  className={styles.featureIcon}
                  style={{ color: feature.color }}
                >
                  {feature.icon}
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
              </div>
              <p className={styles.featureDescription}>{feature.description}</p>
              <div 
                className={styles.featureAccent}
                style={{ background: `linear-gradient(90deg, ${feature.color}20, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <div 
              key={index} 
              className={styles.actionCard}
              onClick={() => router.push(action.path)}
            >
              <div className={styles.actionIcon}>{action.icon}</div>
              <div className={styles.actionContent}>
                <h3 className={styles.actionTitle}>{action.title}</h3>
                <p className={styles.actionDescription}>{action.description}</p>
              </div>
              <div className={styles.actionButton}>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Section */}
      <div className={styles.dashboardSection}>
        <div className={styles.dashboardGrid}>
          {/* Stats Overview */}
          <div className={styles.dashboardCard}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardIcon}>📊</span>
              Performance Overview
            </h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.activeContacts}</div>
                <div className={styles.statText}>Active Contacts</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.clickRate}%</div>
                <div className={styles.statText}>Click Rate</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.automations}</div>
                <div className={styles.statText}>Automations</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.dashboardCard}>
            <h3 className={styles.cardTitle}>
              <span className={styles.cardIcon}>🕒</span>
              Recent Activity
            </h3>
            <div className={styles.activityList}>
              {recentActivity.map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityDot} />
                  <div className={styles.activityContent}>
                    <div className={styles.activityAction}>{activity.action}</div>
                    <div className={styles.activityTime}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className={styles.gettingStarted}>
        <div className={styles.gettingStartedContent}>
          <h2 className={styles.gettingStartedTitle}>Ready to get started?</h2>
          <p className={styles.gettingStartedDescription}>
            Create your first email campaign and experience the power of AI-driven email marketing
          </p>
          <div className={styles.gettingStartedActions}>
            <button className={styles.primaryButton}>
              <span className={styles.buttonIcon}>🚀</span>
              Create First Campaign
            </button>
            <button className={styles.secondaryButton}>
              <span className={styles.buttonIcon}>📖</span>
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
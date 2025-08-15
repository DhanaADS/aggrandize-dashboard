'use client';

import { useRouter } from 'next/navigation';
import styles from './tools.module.css';

export default function ToolsPage() {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Utility Tools</h1>
          <p className={styles.subtitle}>
            Access to various utility tools and resources
          </p>
        </div>
      </div>
      
      <div className={styles.toolsGrid}>
        <div 
          className={styles.toolCard} 
          onClick={() => router.push('/dashboard/scryptr')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>🤖</div>
            <h3 className={styles.toolTitle}>Scryptr</h3>
            <p className={styles.toolDescription}>
              AI-powered content intelligence and extraction
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.activeBadge}>Launch Tool</div>
          </div>
        </div>
        
        <div 
          className={styles.toolCard}
          onClick={() => router.push('/dashboard/workflow-editor')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>📊</div>
            <h3 className={styles.toolTitle}>Workflow Editor</h3>
            <p className={styles.toolDescription}>
              Create and manage automation workflows
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.activeBadge}>Launch Tool</div>
          </div>
        </div>
        
        <div 
          className={styles.toolCard}
          onClick={() => router.push('/dashboard/web-scraping')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>🕷️</div>
            <h3 className={styles.toolTitle}>Web Scraping</h3>
            <p className={styles.toolDescription}>
              Extract and analyze data from websites
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.activeBadge}>Launch Tool</div>
          </div>
        </div>
        
        <div 
          className={styles.toolCard}
          onClick={() => router.push('/dashboard/mailforge')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>📧</div>
            <h3 className={styles.toolTitle}>MailForge</h3>
            <p className={styles.toolDescription}>
              AI-powered email management & automation
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.activeBadge}>Launch Tool</div>
          </div>
        </div>
        
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>💾</div>
            <h3 className={styles.toolTitle}>Backup & Restore</h3>
            <p className={styles.toolDescription}>
              Backup and restore system data
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
          </div>
        </div>
        
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>🔑</div>
            <h3 className={styles.toolTitle}>API Access</h3>
            <p className={styles.toolDescription}>
              API keys and documentation
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
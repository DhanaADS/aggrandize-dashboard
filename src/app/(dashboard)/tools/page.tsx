import styles from './tools.module.css';

export default function ToolsPage() {
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
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>📤</div>
            <h3 className={styles.toolTitle}>Data Export</h3>
            <p className={styles.toolDescription}>
              Export data in various formats
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
          </div>
        </div>
        
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>📊</div>
            <h3 className={styles.toolTitle}>Analytics</h3>
            <p className={styles.toolDescription}>
              Generate reports and analytics
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
          </div>
        </div>
        
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>⚙️</div>
            <h3 className={styles.toolTitle}>System Settings</h3>
            <p className={styles.toolDescription}>
              Configure system preferences
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
          </div>
        </div>
        
        <div className={styles.toolCard}>
          <div className={styles.toolHeader}>
            <div className={styles.toolIcon}>👥</div>
            <h3 className={styles.toolTitle}>User Management</h3>
            <p className={styles.toolDescription}>
              Manage user roles and permissions
            </p>
          </div>
          <div className={styles.toolContent}>
            <div className={styles.comingSoonBadge}>Coming Soon</div>
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
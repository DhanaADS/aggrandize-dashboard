import styles from './processing.module.css';

export default function ProcessingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Processing Workflow</h1>
          <p className={styles.subtitle}>
            Monitor and manage order processing stages
          </p>
        </div>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>In Queue</h3>
            <div className={styles.cardIcon}>⏳</div>
          </div>
          <div className={styles.cardValue}>23</div>
          <p className={`${styles.cardChange} ${styles.neutral}`}>
            Orders waiting for processing
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>In Progress</h3>
            <div className={styles.cardIcon}>⚙️</div>
          </div>
          <div className={styles.cardValue}>12</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            Currently being processed
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Quality Check</h3>
            <div className={styles.cardIcon}>🔍</div>
          </div>
          <div className={styles.cardValue}>8</div>
          <p className={`${styles.cardChange} ${styles.neutral}`}>
            Awaiting quality review
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Completed Today</h3>
            <div className={styles.cardIcon}>✅</div>
          </div>
          <div className={styles.cardValue}>34</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            +18% from yesterday
          </p>
        </div>
      </div>
      
      <div className={styles.largeCard}>
        <h2 className={styles.largeCardTitle}>Processing Pipeline</h2>
        <p className={styles.largeCardSubtitle}>
          Current status of orders in the processing workflow
        </p>
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>🔄</div>
          <h3 className={styles.comingSoonTitle}>Workflow Management Coming Soon</h3>
          <p className={styles.comingSoonText}>
            Advanced processing pipeline management, real-time status tracking, and workflow automation features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
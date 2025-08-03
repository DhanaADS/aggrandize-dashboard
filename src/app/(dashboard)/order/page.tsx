import styles from './order.module.css';

export default function OrderPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Order Management</h1>
          <p className={styles.subtitle}>
            Manage and track customer orders across your business
          </p>
        </div>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Total Orders</h3>
            <div className={styles.cardIcon}>📊</div>
          </div>
          <div className={styles.cardValue}>234</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            +12% from last month
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Pending Orders</h3>
            <div className={styles.cardIcon}>⏳</div>
          </div>
          <div className={styles.cardValue}>45</div>
          <p className={`${styles.cardChange} ${styles.negative}`}>
            -8% from yesterday
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Completed Orders</h3>
            <div className={styles.cardIcon}>✅</div>
          </div>
          <div className={styles.cardValue}>189</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            +15% from last week
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Revenue</h3>
            <div className={styles.cardIcon}>💰</div>
          </div>
          <div className={styles.cardValue}>$12,345</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            +25% from last month
          </p>
        </div>
      </div>
      
      <div className={styles.largeCard}>
        <h2 className={styles.largeCardTitle}>Recent Orders</h2>
        <p className={styles.largeCardSubtitle}>
          Latest orders from customers requiring attention
        </p>
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>📦</div>
          <h3 className={styles.comingSoonTitle}>Order Management Coming Soon</h3>
          <p className={styles.comingSoonText}>
            Advanced order tracking, management, and analytics features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
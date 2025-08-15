import styles from './inventory.module.css';

export default function InventoryPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory Management</h1>
          <p className={styles.subtitle}>
            Track and manage product inventory levels
          </p>
        </div>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Total Items</h3>
            <div className={styles.cardIcon}>📦</div>
          </div>
          <div className={styles.cardValue}>1,234</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            Across all categories
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Low Stock</h3>
            <div className={styles.cardIcon}>⚠️</div>
          </div>
          <div className={styles.cardValue}>23</div>
          <p className={`${styles.cardChange} ${styles.negative}`}>
            Items need restocking
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Out of Stock</h3>
            <div className={styles.cardIcon}>❌</div>
          </div>
          <div className={styles.cardValue}>5</div>
          <p className={`${styles.cardChange} ${styles.negative}`}>
            Items unavailable
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Total Value</h3>
            <div className={styles.cardIcon}>💎</div>
          </div>
          <div className={styles.cardValue}>$45,231</div>
          <p className={`${styles.cardChange} ${styles.positive}`}>
            +8% from last month
          </p>
        </div>
      </div>
      
      <div className={styles.largeCard}>
        <h2 className={styles.largeCardTitle}>Inventory Overview</h2>
        <p className={styles.largeCardSubtitle}>
          Current stock levels and inventory status
        </p>
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>📊</div>
          <h3 className={styles.comingSoonTitle}>Inventory Management Coming Soon</h3>
          <p className={styles.comingSoonText}>
            Advanced inventory tracking, stock alerts, supplier management, and automated reordering features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
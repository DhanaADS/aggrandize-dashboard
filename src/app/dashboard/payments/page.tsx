'use client';

import { useState } from 'react';
import { OverviewTab } from './components/overview/overview-tab';
import { FinancialExpensesTab } from './components/financial-expenses/financial-expenses-tab';
import { SalaryTab } from './components/salary/salary-tab';
import { SubscriptionsTab } from './components/subscriptions/subscriptions-tab';
import { SettlementsTab } from './components/settlements/settlements-tab';
import { ReportsTab } from './components/reports/reports-tab';
import styles from './payments.module.css';

type FinanceTab = 'overview' | 'financial-expenses' | 'salary' | 'subscriptions' | 'settlements' | 'reports';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'financial-expenses' as const, label: 'Financial Expenses', icon: '💰' },
    { id: 'salary' as const, label: 'Salary', icon: '👥' },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: '🔄' },
    { id: 'settlements' as const, label: 'Settlements', icon: '🏢' },
    { id: 'reports' as const, label: 'Reports', icon: '📈' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Finance Management</h1>
          <p className={styles.subtitle}>
            Complete financial tracking and management system
          </p>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${
              activeTab === tab.id ? styles.tabActive : ''
            }`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'financial-expenses' && <FinancialExpensesTab />}
        {activeTab === 'salary' && <SalaryTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'settlements' && <SettlementsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
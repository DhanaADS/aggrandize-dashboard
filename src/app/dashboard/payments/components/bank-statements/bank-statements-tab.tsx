'use client';

import { useState, useEffect, useCallback } from 'react';
import { BankStatement, BankTransaction } from '@/types/bank-statements';
import { Subscription } from '@/types/finance';
import {
  getBankStatements,
  getBankTransactions,
  updateTransactionMatch,
} from '@/lib/bank-statements-api';
import { getSubscriptions } from '@/lib/finance-api';
import UploadDialog from './upload-dialog';
import TransactionTable from './transaction-table';
import styles from '../../payments.module.css';

export default function BankStatementsTab() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch data
  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBankStatements();
      setStatements(data || []);

      // Auto-select first statement if none selected
      if (!selectedStatement && data && data.length > 0) {
        setSelectedStatement(data[0]);
      }
    } catch (err) {
      console.error('Error fetching statements:', err);
      setError('Failed to load bank statements');
    } finally {
      setLoading(false);
    }
  }, [selectedStatement]);

  const fetchTransactions = useCallback(async (statementId: string) => {
    try {
      const data = await getBankTransactions({ statement_id: statementId });
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
    fetchSubscriptions();
  }, [refreshTrigger, fetchStatements, fetchSubscriptions]);

  useEffect(() => {
    if (selectedStatement) {
      fetchTransactions(selectedStatement.id);
    }
  }, [selectedStatement, fetchTransactions]);

  // Handlers
  const handleUploadComplete = (statementId: string) => {
    setShowUploadDialog(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMatchConfirm = async (transactionId: string, subscriptionId: string) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) return;

      const matchReason = `Manually matched with ${subscription.platform}`;

      await updateTransactionMatch(transactionId, subscriptionId, 1.0, matchReason);

      // Refresh transactions
      if (selectedStatement) {
        fetchTransactions(selectedStatement.id);
      }
    } catch (err) {
      console.error('Error confirming match:', err);
      setError('Failed to confirm match');
    }
  };

  const handleIgnore = async (transactionId: string) => {
    try {
      // Update transaction to ignored status
      const tx = transactions.find(t => t.id === transactionId);
      if (tx) {
        // Update via API (you'd need to add an updateTransaction function)
        console.log('Ignoring transaction:', transactionId);
        // For now, just refresh
        if (selectedStatement) {
          fetchTransactions(selectedStatement.id);
        }
      }
    } catch (err) {
      console.error('Error ignoring transaction:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className={styles.tabContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bank Statements</h1>
          <p className={styles.subtitle}>
            Upload bank statements and automatically match transactions with subscriptions
          </p>
        </div>
        <button className={styles.button} onClick={() => setShowUploadDialog(true)}>
          + Upload Statement
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className={styles.contentLayout}>
        {/* Statements Sidebar */}
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Statements ({statements.length})</h3>

          {loading ? (
            <div className={styles.loadingState}>Loading...</div>
          ) : statements.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No statements uploaded yet</p>
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowUploadDialog(true)}
              >
                Upload First Statement
              </button>
            </div>
          ) : (
            <div className={styles.statementsList}>
              {statements.map((stmt) => (
                <div
                  key={stmt.id}
                  className={`${styles.statementItem} ${
                    selectedStatement?.id === stmt.id ? styles.statementItemActive : ''
                  }`}
                  onClick={() => setSelectedStatement(stmt)}
                >
                  <div className={styles.statementHeader}>
                    <div className={styles.statementBank}>
                      {stmt.bank_name || 'Unknown Bank'}
                    </div>
                    <div
                      className={styles.statementStatus}
                      style={{ color: getStatusColor(stmt.processing_status) }}
                    >
                      {stmt.processing_status}
                    </div>
                  </div>

                  <div className={styles.statementFile}>{stmt.file_name}</div>

                  <div className={styles.statementStats}>
                    <span>
                      {stmt.total_transactions} transactions
                    </span>
                    {stmt.matched_transactions > 0 && (
                      <span className={styles.statementMatched}>
                        {stmt.matched_transactions} matched
                      </span>
                    )}
                  </div>

                  <div className={styles.statementDate}>
                    {formatDate(stmt.upload_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content - Transactions */}
        <div className={styles.mainContent}>
          {selectedStatement ? (
            <>
              <div className={styles.statementDetails}>
                <h2>{selectedStatement.bank_name || 'Bank Statement'}</h2>
                <div className={styles.statementMeta}>
                  <span>File: {selectedStatement.file_name}</span>
                  {selectedStatement.statement_period_start && (
                    <span>
                      Period: {formatDate(selectedStatement.statement_period_start)} -{' '}
                      {selectedStatement.statement_period_end
                        ? formatDate(selectedStatement.statement_period_end)
                        : 'Present'}
                    </span>
                  )}
                  {selectedStatement.account_number && (
                    <span>Account: ****{selectedStatement.account_number}</span>
                  )}
                </div>
              </div>

              <TransactionTable
                transactions={transactions}
                subscriptions={subscriptions}
                onMatchConfirm={handleMatchConfirm}
                onIgnore={handleIgnore}
              />
            </>
          ) : (
            <div className={styles.emptyMainContent}>
              <p>Select a statement to view transactions</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <UploadDialog
          onClose={() => setShowUploadDialog(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}

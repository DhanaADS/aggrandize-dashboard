'use client';

import { useState } from 'react';
import { BankTransaction } from '@/types/bank-statements';
import { Subscription } from '@/types/finance';
import styles from '../../payments.module.css';

interface TransactionTableProps {
  transactions: BankTransaction[];
  subscriptions: Subscription[];
  onMatchConfirm: (transactionId: string, subscriptionId: string) => void;
  onIgnore: (transactionId: string) => void;
}

export default function TransactionTable({
  transactions,
  subscriptions,
  onMatchConfirm,
  onIgnore,
}: TransactionTableProps) {
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [matchingSub, setMatchingSub] = useState<string>('');

  const handleManualMatch = (txId: string) => {
    if (matchingSub) {
      onMatchConfirm(txId, matchingSub);
      setSelectedTx(null);
      setMatchingSub('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <span className={styles.statusSuccess}>Matched</span>;
      case 'unmatched':
        return <span className={styles.statusWarning}>Unmatched</span>;
      case 'manual':
        return <span className={styles.statusInfo}>Manual</span>;
      case 'ignored':
        return <span className={styles.statusNeutral}>Ignored</span>;
      default:
        return <span className={styles.statusNeutral}>{status}</span>;
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const percent = (confidence * 100).toFixed(0);
    let className = styles.confidenceLow;

    if (confidence >= 0.8) {
      className = styles.confidenceHigh;
    } else if (confidence >= 0.6) {
      className = styles.confidenceMedium;
    }

    return <span className={className}>{percent}%</span>;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter transactions by type
  const debits = transactions.filter(t => t.transaction_type === 'debit');
  const credits = transactions.filter(t => t.transaction_type === 'credit');

  // Stats
  const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
  const matchedCount = transactions.filter(t => t.match_status === 'matched').length;

  return (
    <div className={styles.transactionTableContainer}>
      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Transactions</div>
          <div className={styles.summaryValue}>{transactions.length}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Debits</div>
          <div className={styles.summaryValue} style={{ color: '#ef4444' }}>
            {formatAmount(totalDebits)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Credits</div>
          <div className={styles.summaryValue} style={{ color: '#10b981' }}>
            {formatAmount(totalCredits)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Matched</div>
          <div className={styles.summaryValue}>
            {matchedCount} / {debits.length}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Status</th>
              <th>Match</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.transaction_date)}</td>
                  <td>
                    <div className={styles.txDescription}>
                      <div>{tx.description}</div>
                      {tx.normalized_description && tx.normalized_description !== tx.description && (
                        <div className={styles.txNormalized}>
                          {tx.normalized_description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={tx.transaction_type === 'debit' ? styles.debit : styles.credit}>
                    {formatAmount(tx.amount)}
                  </td>
                  <td>
                    <span className={tx.transaction_type === 'debit' ? styles.badgeDebit : styles.badgeCredit}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td>{getStatusBadge(tx.match_status)}</td>
                  <td>
                    {tx.matched_subscription_id ? (
                      <div className={styles.matchedInfo}>
                        <div>
                          {tx.matched_subscription?.platform || 'Subscription'}
                        </div>
                        {tx.match_reason && (
                          <div className={styles.matchReason}>
                            {tx.match_reason}
                          </div>
                        )}
                      </div>
                    ) : selectedTx === tx.id ? (
                      <select
                        className={styles.select}
                        value={matchingSub}
                        onChange={(e) => setMatchingSub(e.target.value)}
                        autoFocus
                      >
                        <option value="">Select subscription...</option>
                        {subscriptions
                          .filter(s => s.is_active && s.auto_renewal)
                          .map(sub => (
                            <option key={sub.id} value={sub.id}>
                              {sub.platform} - {formatAmount(sub.amount_inr)}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className={styles.noMatch}>-</span>
                    )}
                  </td>
                  <td>{getConfidenceBadge(tx.match_confidence)}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      {tx.match_status === 'unmatched' && (
                        <>
                          {selectedTx === tx.id ? (
                            <>
                              <button
                                className={styles.buttonSmall}
                                onClick={() => handleManualMatch(tx.id)}
                                disabled={!matchingSub}
                              >
                                ✓
                              </button>
                              <button
                                className={styles.buttonSmallSecondary}
                                onClick={() => {
                                  setSelectedTx(null);
                                  setMatchingSub('');
                                }}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={styles.buttonSmall}
                                onClick={() => setSelectedTx(tx.id)}
                              >
                                Match
                              </button>
                              <button
                                className={styles.buttonSmallSecondary}
                                onClick={() => onIgnore(tx.id)}
                              >
                                Ignore
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {tx.match_status === 'matched' && (
                        <span className={styles.matchedIndicator}>✓ Matched</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

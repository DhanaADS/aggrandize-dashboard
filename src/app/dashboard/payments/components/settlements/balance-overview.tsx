'use client';

import { useState, useEffect } from 'react';
import { TeamBalanceOverview } from '@/types/finance';
import { getTeamBalanceOverview } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface BalanceOverviewProps {
  refreshTrigger?: number;
}

export function BalanceOverview({ refreshTrigger }: BalanceOverviewProps) {
  const [balanceData, setBalanceData] = useState<TeamBalanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBalanceData = async () => {
    try {
      setIsLoading(true);
      const data = await getTeamBalanceOverview();
      setBalanceData(data);
    } catch (error) {
      console.error('Error loading balance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalanceData();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return '#10b981'; // Green - owed money
    if (balance < 0) return '#ef4444'; // Red - owes money
    return '#3b82f6'; // Blue - neutral
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return '💰'; // Owed money
    if (balance < 0) return '💸'; // Owes money
    return '⚖️'; // Balanced
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: 'rgba(15, 23, 42, 0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            minHeight: '120px'
          }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
              Loading balance data...
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!balanceData) {
    return (
      <div style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        textAlign: 'center',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        Unable to load balance data
      </div>
    );
  }

  const totalCreditors = balanceData.person_balances.filter(p => p.net_balance > 0);
  const totalDebtors = balanceData.person_balances.filter(p => p.net_balance < 0);
  const totalPendingAmount = Math.abs(totalDebtors.reduce((sum, p) => sum + p.net_balance, 0));
  const totalOwedAmount = totalCreditors.reduce((sum, p) => sum + p.net_balance, 0);

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Balance Overview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Outstanding */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.1) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
            <h3 style={{
              color: '#a855f7',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              TOTAL OUTSTANDING
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.8rem',
            fontWeight: '800',
            margin: '0.5rem 0'
          }}>
            {formatCurrency(totalOwedAmount)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            Amount owed to team members
          </div>
        </div>

        {/* Active Creditors */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💳</span>
            <h3 style={{
              color: '#10b981',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              TOP CREDITOR
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: '0.5rem 0'
          }}>
            {balanceData.top_creditors[0]?.person || 'None'}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            {balanceData.top_creditors[0] 
              ? `Owed ${formatCurrency(balanceData.top_creditors[0].net_balance)}`
              : 'No outstanding creditors'
            }
          </div>
        </div>

        {/* Active Debtors */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💸</span>
            <h3 style={{
              color: '#ef4444',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              TOP DEBTOR
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: '0.5rem 0'
          }}>
            {balanceData.top_debtors[0]?.person || 'None'}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            {balanceData.top_debtors[0] 
              ? `Owes ${formatCurrency(Math.abs(balanceData.top_debtors[0].net_balance))}`
              : 'No outstanding debtors'
            }
          </div>
        </div>

        {/* Settlement Suggestions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
          border: '1px solid rgba(251, 146, 60, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <h3 style={{
              color: '#fb923c',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              SMART SUGGESTIONS
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.8rem',
            fontWeight: '800',
            margin: '0.5rem 0'
          }}>
            {balanceData.suggested_settlements.length}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            Auto-generated settlements ready
          </div>
        </div>
      </div>

      {/* Team Balance Matrix */}
      {balanceData.person_balances.length > 0 && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            color: '#ffffff',
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: '0 0 1rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚖️</span> Team Balance Overview
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {balanceData.person_balances.map(person => (
              <div 
                key={person.person}
                style={{
                  background: `linear-gradient(135deg, ${getBalanceColor(person.net_balance)}20 0%, ${getBalanceColor(person.net_balance)}10 100%)`,
                  border: `1px solid ${getBalanceColor(person.net_balance)}30`,
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  {getBalanceIcon(person.net_balance)}
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '0.25rem'
                }}>
                  {person.person}
                </div>
                <div style={{
                  color: getBalanceColor(person.net_balance),
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  marginBottom: '0.25rem'
                }}>
                  {formatCurrency(Math.abs(person.net_balance))}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem'
                }}>
                  {person.net_balance > 0 ? 'Is owed' : person.net_balance < 0 ? 'Owes' : 'Balanced'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div style={{
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.8rem',
        textAlign: 'center',
        marginTop: '1rem'
      }}>
        Last updated: {new Date(balanceData.last_updated).toLocaleString()}
      </div>
    </div>
  );
}
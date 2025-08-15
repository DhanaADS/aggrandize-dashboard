'use client';

import { useState } from 'react';
import styles from '../../payments.module.css';

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const quickActions = [
    {
      id: 'add-expense',
      title: 'Add Expense',
      description: 'Record a new expense',
      icon: '💸',
      color: '#10b981',
    },
    {
      id: 'add-subscription',
      title: 'Add Subscription',
      description: 'Add new subscription',
      icon: '🔄',
      color: '#3b82f6',
    },
    {
      id: 'record-settlement',
      title: 'Record Settlement',
      description: 'Track team payments',
      icon: '💰',
      color: '#8b5cf6',
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Financial analytics',
      icon: '📊',
      color: '#f59e0b',
    },
  ];

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    // TODO: Implement action handlers
    console.log(`Action clicked: ${actionId}`);
    
    // Reset after animation
    setTimeout(() => setActiveAction(null), 200);
  };

  return (
    <div className={styles.card}>
      <h3 style={{ 
        color: '#ffffff', 
        fontSize: '1.25rem', 
        fontWeight: '600',
        margin: '0 0 1.5rem 0',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
      }}>
        Quick Actions
      </h3>
      
      <div style={{ display: 'grid', gap: '1rem' }}>
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.id)}
            className={styles.buttonSecondary}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              textAlign: 'left',
              width: '100%',
              transform: activeAction === action.id ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ 
              fontSize: '1.5rem',
              filter: `drop-shadow(0 0 10px ${action.color}40)`
            }}>
              {action.icon}
            </div>
            <div>
              <div style={{ 
                fontWeight: '600', 
                color: '#ffffff',
                fontSize: '0.95rem'
              }}>
                {action.title}
              </div>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8rem',
                marginTop: '0.25rem'
              }}>
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ 
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 255, 136, 0.2)'
      }}>
        <div style={{ 
          color: '#00ff88',
          fontSize: '0.85rem',
          fontWeight: '500',
          marginBottom: '0.5rem'
        }}>
          💡 Quick Tip
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}>
          Use keyboard shortcuts: <code style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            color: '#00ff88'
          }}>Ctrl+E</code> for expenses, <code style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            color: '#00ff88'
          }}>Ctrl+S</code> for subscriptions
        </div>
      </div>
    </div>
  );
}
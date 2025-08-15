'use client';

import { formatCurrency } from '@/lib/salary-payments-api';

interface TotalCardProps {
  title: string;
  amount: number | null;
  color: string;
  icon: string;
}

export function TotalCard({ title, amount, color, icon }: TotalCardProps) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${color}`,
      borderRadius: '20px',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color} 100%)`,
          borderRadius: '16px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        </div>
        <div>
          <h3 style={{
            color: '#ffffff',
            fontSize: '1.2rem',
            fontWeight: '700',
            margin: '0 0 0.25rem 0'
          }}>
            {title}
          </h3>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          color: color,
          fontSize: '2.5rem',
          fontWeight: '800',
          lineHeight: 1,
          marginBottom: '0.5rem'
        }}>
          {amount !== null ? formatCurrency(amount) : 'Loading...'}
        </div>
      </div>
    </div>
  );
}

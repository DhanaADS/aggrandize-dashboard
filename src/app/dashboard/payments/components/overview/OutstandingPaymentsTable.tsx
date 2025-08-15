'use client';

import { useEffect, useState } from 'react';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';
import { getUtilityBills, getExpenses, getSubscriptions, getTeamSettlementStatus } from '@/lib/finance-api';
import { formatCurrency } from '@/lib/salary-payments-api';
import { DateRange } from './date-range-selector';
import styles from '../../payments.module.css';

interface OutstandingData {
  pendingSalary: number | null;
  pendingUtility: number | null;
  pendingExpenses: number | null;
  pendingSubscription: number | null;
  pendingSettlement: number | null;
}

interface OutstandingPaymentsTableProps {
  onTotalChange: (total: number) => void;
  dateRange: DateRange;
  isEditable?: boolean;
}

export function OutstandingPaymentsTable({ onTotalChange, dateRange }: OutstandingPaymentsTableProps) {
  const [outstandingData, setOutstandingData] = useState<OutstandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOutstandingData = async () => {
      try {
        setIsLoading(true);
        
        // Extract month from date range for salary and settlement data
        const fromMonth = dateRange.from.slice(0, 7); // YYYY-MM format
        const toMonth = dateRange.to.slice(0, 7); // YYYY-MM format

        const [salaryOverview, subscriptions, settlementStatus] = await Promise.all([
          getMonthlySalaryOverview(fromMonth), // Note: this API might need adjustment for date ranges
          getSubscriptions(),
          getTeamSettlementStatus(fromMonth) // Note: this API might need adjustment for date ranges
        ]);

        const pendingSalary = salaryOverview.total_pending_amount;

        // Filter subscriptions within the date range that are still pending
        const today = new Date();
        const pendingSubscriptions = subscriptions.filter(sub => {
          const paymentDate = new Date(sub.due_date);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          return paymentDate >= fromDate && paymentDate <= toDate && paymentDate > today && sub.is_active;
        });
        const pendingSubscription = pendingSubscriptions.reduce((sum, sub) => sum + sub.amount_inr, 0);

        const memberMap = new Map<string, { totalAmount: number }>();
        const expenses = await getExpenses({ 
          date_from: dateRange.from, 
          date_to: dateRange.to 
        });
        const utilityBills = await getUtilityBills({ 
          month_from: fromMonth, 
          month_to: toMonth 
        });
        expenses.forEach(expense => {
          if (expense.person_paid && expense.payment_status === 'paid') {
            const shouldCreateSettlement = !expense.person_responsible || (expense.person_responsible && expense.person_paid !== expense.person_responsible);
            if (shouldCreateSettlement) {
              const payer = expense.person_paid;
              if (!memberMap.has(payer)) {
                memberMap.set(payer, { totalAmount: 0 });
              }
              memberMap.get(payer)!.totalAmount += expense.amount_inr;
            }
          }
        });
        utilityBills.forEach(bill => {
          if (bill.paid_by && bill.paid_by !== 'Office') {
            const payer = bill.paid_by;
            if (!memberMap.has(payer)) {
              memberMap.set(payer, { totalAmount: 0 });
            }
            memberMap.get(payer)!.totalAmount += bill.amount_inr;
          }
        });
        pendingSubscriptions.forEach(subscription => {
          if (subscription.paid_by) {
            const payer = subscription.paid_by;
            if (!memberMap.has(payer)) {
              memberMap.set(payer, { totalAmount: 0 });
            }
            memberMap.get(payer)!.totalAmount += subscription.amount_inr;
          }
        });
        let totalPending = 0;
        for (const [memberName, data] of memberMap.entries()) {
          if (!settlementStatus[memberName]) {
            totalPending += data.totalAmount;
          }
        }

        const total = pendingSalary + pendingSubscription + totalPending;
        onTotalChange(total);

        setOutstandingData({
          pendingSalary,
          pendingUtility: 0,
          pendingExpenses: 0,
          pendingSubscription,
          pendingSettlement: totalPending
        });

      } catch (error) {
        console.error('Error fetching outstanding data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutstandingData();
  }, [onTotalChange, dateRange]);

  const tableData = [
    { icon: '💰', label: 'Salary', value: outstandingData?.pendingSalary, color: '#f59e0b' },
    { icon: '💳', label: 'Subscription Payment', value: outstandingData?.pendingSubscription, color: '#f59e0b' },
    { icon: '⏳', label: 'Settlement', value: outstandingData?.pendingSettlement, color: '#f59e0b' },
  ];

  return (
    <div className={styles.card}>
      <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '600', marginBottom: '1.5rem' }}>Outstanding Payments</h3>
      {isLoading ? (
        <div style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>{row.icon}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{row.label}</span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: row.color, fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {formatCurrency(row.value ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

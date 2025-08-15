'use client';

import { useEffect, useState } from 'react';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';
import { getUtilityBills, getExpenses, getSubscriptions, getTeamSettlementStatus } from '@/lib/finance-api';
import { formatCurrency } from '@/lib/salary-payments-api';
import { DateRange } from './date-range-selector';
import styles from '../../payments.module.css';

interface SettledData {
  totalSalary: number | null;
  totalUtility: number | null;
  totalExpenses: number | null;
  totalSubscription: number | null;
  completedSettlement: number | null;
}

interface SettledPaymentsTableProps {
  onTotalChange: (total: number) => void;
  dateRange: DateRange;
  isEditable?: boolean;
}

export function SettledPaymentsTable({ onTotalChange, dateRange }: SettledPaymentsTableProps) {
  const [settledData, setSettledData] = useState<SettledData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettledData = async () => {
      try {
        setIsLoading(true);
        
        // Extract month from date range for salary and settlement data
        const fromMonth = dateRange.from.slice(0, 7); // YYYY-MM format
        const toMonth = dateRange.to.slice(0, 7); // YYYY-MM format
        
        const [salaryOverview, allUtilityBills, allExpenses, subscriptions, settlementStatus] = await Promise.all([
          getMonthlySalaryOverview(fromMonth), // Note: this API might need adjustment for date ranges
          getUtilityBills({ 
            month_from: fromMonth, 
            month_to: toMonth 
          }),
          getExpenses({ 
            date_from: dateRange.from, 
            date_to: dateRange.to 
          }),
          getSubscriptions(),
          getTeamSettlementStatus(fromMonth) // Note: this API might need adjustment for date ranges
        ]);

        const totalSalary = salaryOverview.total_paid_amount;

        const totalUtility = allUtilityBills.reduce((sum, bill) => sum + bill.amount_inr, 0);

        const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount_inr, 0);

        // Filter subscriptions within the date range
        const filteredSubscriptions = subscriptions.filter(sub => {
          const paymentDate = new Date(sub.due_date);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          return paymentDate >= fromDate && paymentDate <= toDate && sub.is_active;
        });
        const totalSubscription = filteredSubscriptions.reduce((sum, sub) => sum + sub.amount_inr, 0);

        const memberMap = new Map<string, { totalAmount: number }>();
        allExpenses.forEach(expense => {
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
        allUtilityBills.forEach(bill => {
          if (bill.paid_by && bill.paid_by !== 'Office') {
            const payer = bill.paid_by;
            if (!memberMap.has(payer)) {
              memberMap.set(payer, { totalAmount: 0 });
            }
            memberMap.get(payer)!.totalAmount += bill.amount_inr;
          }
        });
        filteredSubscriptions.forEach(subscription => {
          if (subscription.paid_by) {
            const payer = subscription.paid_by;
            if (!memberMap.has(payer)) {
              memberMap.set(payer, { totalAmount: 0 });
            }
            memberMap.get(payer)!.totalAmount += subscription.amount_inr;
          }
        });
        let totalSettled = 0;
        for (const [memberName, data] of memberMap.entries()) {
          if (settlementStatus[memberName]) {
            totalSettled += data.totalAmount;
          }
        }

        const total = totalSalary + totalUtility + totalExpenses + totalSubscription + totalSettled;
        onTotalChange(total);

        setSettledData({
          totalSalary,
          totalUtility,
          totalExpenses,
          totalSubscription,
          completedSettlement: totalSettled
        });

      } catch (error) {
        console.error('Error fetching settled data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettledData();
  }, [onTotalChange, dateRange]);

  const tableData = [
    { icon: '💰', label: 'Salary', value: settledData?.totalSalary, color: '#10b981' },
    { icon: '💡', label: 'Utility Bill', value: settledData?.totalUtility, color: '#10b981' },
    { icon: '💸', label: 'Other Expenses', value: settledData?.totalExpenses, color: '#10b981' },
    { icon: '💳', label: 'Subscription Payment', value: settledData?.totalSubscription, color: '#10b981' },
    { icon: '✅', label: 'Settlement', value: settledData?.completedSettlement, color: '#10b981' },
  ];

  return (
    <div className={styles.card}>
      <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '600', marginBottom: '1.5rem' }}>Settled Payments</h3>
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

'use client';

import { useState, useEffect } from 'react';
import { getExpenses, getSubscriptions, getUtilityBills, getTeamSettlementStatus, updateTeamSettlementStatus, bulkUpdateTeamSettlementStatus } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface TeamMemberSummary {
  memberName: string;
  count: number;
  totalAmount: number;
  isSettled: boolean;
}

interface SettlementListProps {
  onEdit?: (settlement: any) => void;
  refreshTrigger?: number;
  selectedMonth?: string;
  isEditable?: boolean;
}

export function SettlementList({ onEdit, refreshTrigger }: SettlementListProps) {
  const [teamSummaries, setTeamSummaries] = useState<TeamMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlySummary, setMonthlySummary] = useState({
    totalAmount: 0,
    totalMembers: 0,
    settledAmount: 0,
    pendingAmount: 0
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Get all expenses (remove paid filter to see all data first)
      const expenses = await getExpenses();
      
      // Get utility bills for August 2025
      const utilityBills = await getUtilityBills({ 
        month_from: '2025-08',
        month_to: '2025-08'
      });
      
      // Get all active subscriptions
      const subscriptions = await getSubscriptions();
      
      console.log('=== SETTLEMENT DEBUG - August 2025 ===');
      console.log('Debug - Total expenses:', expenses.length);
      console.log('Debug - Total utility bills (Aug 2025):', utilityBills.length);
      console.log('Debug - Total subscriptions:', subscriptions.length);
      console.log('Debug - Utility bills data:', utilityBills);
      
      // Create team member summary
      const memberMap = new Map<string, TeamMemberSummary>();
      
      // Process expenses - find where person_paid exists and differs from person_responsible
      expenses.forEach(expense => {
        console.log('Debug expense:', {
          purpose: expense.purpose,
          person_paid: expense.person_paid,
          person_responsible: expense.person_responsible,
          payment_status: expense.payment_status
        });
        
        // Check if someone paid on behalf of team (person_paid exists)
        if (expense.person_paid && expense.payment_status === 'paid') {
          // If person_responsible exists and is different, it's a settlement case
          // If person_responsible doesn't exist, assume person_paid paid for the team
          const shouldCreateSettlement = !expense.person_responsible || 
                                        (expense.person_responsible && expense.person_paid !== expense.person_responsible);
          
          if (shouldCreateSettlement) {
            const payer = expense.person_paid;
            if (!memberMap.has(payer)) {
              memberMap.set(payer, {
                memberName: payer,
                count: 0,
                totalAmount: 0,
                isSettled: false
              });
            }
            
            const member = memberMap.get(payer)!;
            member.count += 1;
            member.totalAmount += expense.amount_inr;
            console.log('Debug - Added expense to member:', payer, expense.amount_inr);
          }
        }
      });
      
      // Process utility bills - find where paid_by exists (means they paid for team)
      utilityBills.forEach(bill => {
        console.log('Debug utility bill:', {
          provider_name: bill.provider_name,
          bill_type: bill.bill_type,
          paid_by: bill.paid_by,
          payment_status: bill.payment_status,
          amount_inr: bill.amount_inr,
          bill_month: bill.bill_month
        });
        
        // Check if someone paid the utility bill (paid_by exists)
        // For utility bills, we include all bills where paid_by is set (regardless of payment_status for now)
        if (bill.paid_by) {
          const payer = bill.paid_by;
          
          // Skip "Office" as payer since Office is not a team member who needs reimbursement
          if (payer !== 'Office') {
            if (!memberMap.has(payer)) {
              memberMap.set(payer, {
                memberName: payer,
                count: 0,
                totalAmount: 0,
                isSettled: false
              });
            }
            
            const member = memberMap.get(payer)!;
            member.count += 1;
            member.totalAmount += bill.amount_inr;
            console.log('Debug - Added utility bill to member:', payer, bill.amount_inr, 'Provider:', bill.provider_name);
          } else {
            console.log('Debug - Skipped Office payment:', bill.provider_name, bill.amount_inr);
          }
        }
      });
      
      // Process subscriptions - find where paid_by exists (means they paid for team)
      subscriptions.forEach(subscription => {
        if (subscription.paid_by) {
          const payer = subscription.paid_by;
          if (!memberMap.has(payer)) {
            memberMap.set(payer, {
              memberName: payer,
              count: 0,
              totalAmount: 0,
              isSettled: false
            });
          }
          
          const member = memberMap.get(payer)!;
          member.count += 1;
          member.totalAmount += subscription.amount_inr;
          console.log('Debug - Added subscription to member:', payer, subscription.amount_inr);
        }
      });
      
      const summaries = Array.from(memberMap.values());
      console.log('=== SETTLEMENT PROCESSING COMPLETE ===');
      console.log('Debug - Final member summaries:', summaries);
      console.log('Debug - Total members with settlements:', summaries.length);
      summaries.forEach(member => {
        console.log(`  → ${member.memberName}: ${member.count} items, ₹${member.totalAmount.toLocaleString()}`);
      });
      
      // Load saved settlement status from database for August 2025
      const currentMonth = '2025-08';
      try {
        const savedStatus = await getTeamSettlementStatus(currentMonth);
        console.log('Debug - Loaded saved settlement status:', savedStatus);
        
        // Apply saved status to summaries
        const summariesWithStatus = summaries.map(member => ({
          ...member,
          isSettled: savedStatus[member.memberName] || false
        }));
        
        setTeamSummaries(summariesWithStatus);
        
        // Calculate monthly summary AFTER loading settlement status
        const totalAmount = summariesWithStatus.reduce((sum, member) => sum + member.totalAmount, 0);
        const settledAmount = summariesWithStatus
          .filter(member => member.isSettled)
          .reduce((sum, member) => sum + member.totalAmount, 0);
        const pendingAmount = totalAmount - settledAmount;
        
        setMonthlySummary({
          totalAmount,
          totalMembers: summariesWithStatus.length,
          settledAmount,
          pendingAmount
        });
        
        console.log('=== MONTHLY SUMMARY CARDS UPDATED ===');
        console.log('Total Amount:', totalAmount);
        console.log('Settled Amount:', settledAmount);
        console.log('Pending Amount:', pendingAmount);
        console.log('Members with settled status:', summariesWithStatus.filter(m => m.isSettled).length);
        
        // Bulk save/update all current summaries to database (to ensure they exist)
        await bulkUpdateTeamSettlementStatus(
          summariesWithStatus.map(member => ({
            memberName: member.memberName,
            isSettled: member.isSettled,
            totalAmount: member.totalAmount,
            itemCount: member.count
          })),
          currentMonth
        );
      } catch (error) {
        console.error('Error loading settlement status:', error);
        // Fall back to local state only
        setTeamSummaries(summaries);
        
        // Calculate monthly summary for fallback
        const totalAmount = summaries.reduce((sum, member) => sum + member.totalAmount, 0);
        const settledAmount = summaries
          .filter(member => member.isSettled)
          .reduce((sum, member) => sum + member.totalAmount, 0);
        const pendingAmount = totalAmount - settledAmount;
        
        setMonthlySummary({
          totalAmount,
          totalMembers: summaries.length,
          settledAmount,
          pendingAmount
        });
        
        console.log('=== MONTHLY SUMMARY CARDS (FALLBACK) ===');
        console.log('Total Amount:', totalAmount);
        console.log('Settled Amount:', settledAmount);
        console.log('Pending Amount:', pendingAmount);
      }
    } catch (error) {
      console.error('Error loading team summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const handleToggleSettlement = async (memberName: string, currentStatus: boolean) => {
    const currentMonth = '2025-08';
    
    try {
      // Update the local state optimistically
      const updatedSummaries = teamSummaries.map(member => 
        member.memberName === memberName 
          ? { ...member, isSettled: !currentStatus }
          : member
      );
      setTeamSummaries(updatedSummaries);

      // Recalculate monthly summary
      const totalAmount = updatedSummaries.reduce((sum, member) => sum + member.totalAmount, 0);
      const settledAmount = updatedSummaries
        .filter(member => member.isSettled)
        .reduce((sum, member) => sum + member.totalAmount, 0);
      const pendingAmount = totalAmount - settledAmount;
      
      setMonthlySummary({
        totalAmount,
        totalMembers: updatedSummaries.length,
        settledAmount,
        pendingAmount
      });

      // Save to database
      const memberData = updatedSummaries.find(member => member.memberName === memberName);
      if (memberData) {
        await updateTeamSettlementStatus(
          memberName,
          !currentStatus,
          currentMonth,
          memberData.totalAmount,
          memberData.count
        );
        console.log(`Settlement status saved: ${memberName} - ${!currentStatus ? 'SETTLED' : 'PENDING'}`);
      }
    } catch (error) {
      console.error('Error updating settlement status:', error);
      // Revert the optimistic update on error
      setTeamSummaries(prev => 
        prev.map(member => 
          member.memberName === memberName 
            ? { ...member, isSettled: currentStatus }
            : member
        )
      );
      alert('Failed to save settlement status. Please try again.');
    }
  };

  return (
    <div>
      {/* Monthly Summary Cards */}
      {!isLoading && teamSummaries.length > 0 && (
        <div className={styles.metricsGrid}>
          {/* Total Amount Card */}
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <div className={styles.metricIcon}>💰</div>
            </div>
            <div className={styles.metricInfo}>
              <h4 className={styles.metricTitle}>Total Settlements</h4>
            </div>
            <div className={styles.metricValue}>
              <div className={styles.primaryValue}>
                {formatCurrency(monthlySummary.totalAmount)}
              </div>
              <div className={styles.secondaryValue}>
                {monthlySummary.totalMembers} team members
              </div>
            </div>
          </div>

          {/* Settled Amount Card */}
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <div className={`${styles.metricIcon} ${styles.colorSuccess}`}>✅</div>
            </div>
            <div className={styles.metricInfo}>
              <h4 className={styles.metricTitle}>Settled</h4>
            </div>
            <div className={styles.metricValue}>
              <div className={`${styles.primaryValue} ${styles.colorSuccess}`}>
                {formatCurrency(monthlySummary.settledAmount)}
              </div>
              <div className={styles.secondaryValue}>
                Completed settlements
              </div>
            </div>
          </div>

          {/* Pending Amount Card */}
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <div className={`${styles.metricIcon} ${styles.colorWarning}`}>⏳</div>
            </div>
            <div className={styles.metricInfo}>
              <h4 className={styles.metricTitle}>Pending</h4>
            </div>
            <div className={styles.metricValue}>
              <div className={`${styles.primaryValue} ${styles.colorWarning}`}>
                {formatCurrency(monthlySummary.pendingAmount)}
              </div>
              <div className={styles.secondaryValue}>
                Awaiting settlements
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h3 className={styles.metricTitle}>
          Team Settlement Summary ({teamSummaries.length} members)
        </h3>

        {/* Loading */}
        {isLoading && (
          <div className={styles.loading}>
            Loading team settlement data...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && teamSummaries.length === 0 && (
          <div className={styles.emptyState}>
            No team members have paid on behalf of others yet.
          </div>
        )}

      {/* Team Summary Table */}
      {!isLoading && teamSummaries.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team Member</th>
              <th className={styles.textCenter}>Count</th>
              <th className={styles.textRight}>Total Amount</th>
              <th className={styles.textCenter}>Settlement</th>
            </tr>
          </thead>
          <tbody>
            {teamSummaries.map((member, index) => (
              <tr key={member.memberName}>
                {/* Team Member */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      background: '#f8fafc',
                      color: '#3b82f6',
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      {member.memberName.charAt(0).toUpperCase()}
                    </div>
                    <span className={styles.fontBold}>{member.memberName}</span>
                  </div>
                </td>
                
                {/* Count */}
                <td className={styles.textCenter}>
                  <span className={`${styles.statusBadge} ${styles.colorWarning}`}>
                    {member.count} items
                  </span>
                </td>
                
                {/* Total Amount */}
                <td className={styles.textRight}>
                  <span className={`${styles.fontBold} ${styles.colorSuccess}`}>
                    {formatCurrency(member.totalAmount)}
                  </span>
                </td>
                
                {/* Settlement Status Toggle */}
                <td className={styles.textCenter}>
                  <button
                    onClick={() => handleToggleSettlement(member.memberName, member.isSettled)}
                    className={member.isSettled ? styles.buttonSuccess : styles.buttonDanger}
                    title={`Click to mark as ${member.isSettled ? 'pending' : 'settled'}`}
                  >
                    {member.isSettled ? '✅ SETTLED' : '⏳ PENDING'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}
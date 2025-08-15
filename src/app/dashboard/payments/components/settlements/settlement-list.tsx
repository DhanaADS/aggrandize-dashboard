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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Total Amount Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💰</span>
              <h4 style={{
                color: '#3b82f6',
                fontSize: '0.8rem',
                fontWeight: '600',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                TOTAL SETTLEMENTS
              </h4>
            </div>
            <div style={{
              color: '#ffffff',
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0.5rem 0'
            }}>
              {formatCurrency(monthlySummary.totalAmount)}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
              {monthlySummary.totalMembers} team members
            </div>
          </div>

          {/* Settled Amount Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <h4 style={{
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: '600',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                SETTLED
              </h4>
            </div>
            <div style={{
              color: '#ffffff',
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0.5rem 0'
            }}>
              {formatCurrency(monthlySummary.settledAmount)}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
              Completed settlements
            </div>
          </div>

          {/* Pending Amount Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⏳</span>
              <h4 style={{
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: '600',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                PENDING
              </h4>
            </div>
            <div style={{
              color: '#ffffff',
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0.5rem 0'
            }}>
              {formatCurrency(monthlySummary.pendingAmount)}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
              Awaiting settlements
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '1.1rem', 
          fontWeight: '600',
          margin: '0 0 1.5rem 0'
        }}>
          Team Settlement Summary ({teamSummaries.length} members)
        </h3>

        {/* Loading */}
        {isLoading && (
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            textAlign: 'center',
            padding: '2rem'
          }}>
            Loading team settlement data...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && teamSummaries.length === 0 && (
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            textAlign: 'center',
            padding: '2rem'
          }}>
            No team members have paid on behalf of others yet.
          </div>
        )}

      {/* Team Summary Table */}
      {!isLoading && teamSummaries.length > 0 && (
        <div style={{ 
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          width: '100%'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'left', 
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '30%'
                }}>TEAM MEMBER</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '20%'
                }}>COUNT</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'right', 
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '30%'
                }}>TOTAL AMOUNT</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '20%'
                }}>SETTLEMENT</th>
              </tr>
            </thead>
            <tbody>
              {teamSummaries.map((member, index) => (
                <tr 
                  key={member.memberName} 
                  style={{ 
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                    transition: 'all 0.2s ease',
                    background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent'
                  }}
                >
                  {/* Team Member */}
                  <td style={{ padding: '0.75rem 1rem', color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        background: 'rgba(59, 130, 246, 0.2)',
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
                      {member.memberName}
                    </div>
                  </td>
                  
                  {/* Count */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ 
                      background: 'rgba(251, 146, 60, 0.2)',
                      color: '#fb923c',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      display: 'inline-block'
                    }}>
                      {member.count} items
                    </div>
                  </td>
                  
                  {/* Total Amount */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ color: '#00ff88', fontWeight: '700', fontSize: '1rem' }}>
                      {formatCurrency(member.totalAmount)}
                    </div>
                  </td>
                  
                  {/* Settlement Status Toggle */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleSettlement(member.memberName, member.isSettled)}
                      style={{
                        background: member.isSettled 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : 'rgba(239, 68, 68, 0.2)',
                        color: member.isSettled ? '#10b981' : '#ef4444',
                        border: member.isSettled 
                          ? '1px solid rgba(16, 185, 129, 0.3)' 
                          : '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        minWidth: '100px'
                      }}
                      title={`Click to mark as ${member.isSettled ? 'pending' : 'settled'}`}
                    >
                      {member.isSettled ? '✅ SETTLED' : '⏳ PENDING'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
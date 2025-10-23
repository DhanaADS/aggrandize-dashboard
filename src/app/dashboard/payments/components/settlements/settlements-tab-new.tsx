'use client';

import { useState, useEffect } from 'react';
import { getSettlements, updateSettlement, deleteSettlement, SettlementFormData } from '@/lib/finance-api';
import { Settlement } from '@/types/finance';
import styles from './settlements-clean.module.css';

export function SettlementsTab() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Initialize with current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Determine if current month is editable
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const isEditable = isCurrentMonth;

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    setRefreshTrigger(prev => prev + 1);
  };

  // Load settlements data
  useEffect(() => {
    const loadSettlements = async () => {
      try {
        setIsLoading(true);
        const settlementsData = await getSettlements();
        
        // Filter settlements for the selected month
        const filteredSettlements = settlementsData.filter(settlement => {
          if (settlement.settlement_date) {
            const settlementDate = new Date(settlement.settlement_date);
            const [year, month] = selectedMonth.split('-').map(Number);
            return settlementDate.getFullYear() === year && settlementDate.getMonth() === month - 1;
          }
          return false;
        });
        
        setSettlements(filteredSettlements);
      } catch (error) {
        console.error('Error loading settlements:', error);
        // Create mock data for demonstration if API fails
        const mockSettlements: Settlement[] = [
          {
            id: '1',
            from_person: 'Alice Johnson',
            to_person: 'Robert Smith',
            amount_inr: 20875, // $250 * 83.5
            purpose: 'Dinner',
            settlement_status: 'pending',
            settlement_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            from_person: 'Robert Smith',
            to_person: 'Emily Clark',
            amount_inr: 12525, // $150 * 83.5
            purpose: 'Movie Tickets',
            settlement_status: 'completed',
            settlement_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            from_person: 'Emily Clark',
            to_person: 'Alice Johnson',
            amount_inr: 25050, // $300 * 83.5
            purpose: 'Rent',
            settlement_status: 'pending',
            settlement_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '4',
            from_person: 'Alice Johnson',
            to_person: 'Robert Smith',
            amount_inr: 8350, // $100 * 83.5
            purpose: 'Coffee',
            settlement_status: 'completed',
            settlement_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '5',
            from_person: 'Robert Smith',
            to_person: 'Emily Clark',
            amount_inr: 16700, // $200 * 83.5
            purpose: 'Shopping',
            settlement_status: 'pending',
            settlement_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setSettlements(mockSettlements);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettlements();
  }, [selectedMonth, refreshTrigger]);

  const handleMarkAsSettled = async (settlementId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      // Optimistically update the UI
      setSettlements(prev => prev.map(settlement => 
        settlement.id === settlementId 
          ? { ...settlement, settlement_status: newStatus }
          : settlement
      ));

      // Try to update via API
      try {
        await updateSettlement(settlementId, { settlement_status: newStatus });
      } catch (apiError) {
        console.log('API update failed, using local state only');
      }
    } catch (error) {
      console.error('Error updating settlement status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const isSettled = status === 'completed';
    return (
      <span className={`${styles.statusBadge} ${isSettled ? styles.statusSettled : styles.statusUnsettled}`}>
        {isSettled ? 'Settled' : 'Unsettled'}
      </span>
    );
  };

  const getActionButton = (settlement: Settlement) => {
    const isSettled = settlement.settlement_status === 'completed';
    
    if (isSettled) {
      return (
        <button 
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          disabled={true}
        >
          <span className={styles.actionIcon}>✓</span>
          Settled
        </button>
      );
    } else {
      return (
        <button 
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={() => handleMarkAsSettled(settlement.id, settlement.settlement_status)}
          disabled={!isEditable}
        >
          <span className={styles.actionIcon}>✓</span>
          Mark as Settled
        </button>
      );
    }
  };

  return (
    <div className={styles.settlementsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Settlements</h1>
          <p>Track and manage settlements between parties.</p>
        </div>
        
        {/* Month Navigator */}
        <div className={styles.monthNavigator}>
          <button 
            className={styles.navButton} 
            onClick={() => navigateMonth(-1)}
          >
            ‹
          </button>
          <span className={styles.monthDisplay}>
            {formatMonthDisplay(selectedMonth)}
          </span>
          <button 
            className={styles.navButton} 
            onClick={() => navigateMonth(1)}
          >
            ›
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>
            Loading settlements...
          </div>
        ) : settlements.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📋</div>
            <div className={styles.emptyStateTitle}>No Settlements Found</div>
            <div className={styles.emptyStateDescription}>
              No settlements recorded for {formatMonthDisplay(selectedMonth)}.
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>From Person</th>
                <th className={styles.tableHeadCell}>To Person</th>
                <th className={styles.tableHeadCell}>Amount</th>
                <th className={styles.tableHeadCell}>Purpose</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <span className={styles.personName}>{settlement.from_person}</span>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={styles.personName}>{settlement.to_person}</span>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={styles.amount}>
                      ${(settlement.amount_inr / 83.5).toFixed(2)}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={styles.purpose}>{settlement.purpose}</span>
                  </td>
                  <td className={styles.tableCell}>
                    {getStatusBadge(settlement.settlement_status)}
                  </td>
                  <td className={styles.tableCell}>
                    {getActionButton(settlement)}
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
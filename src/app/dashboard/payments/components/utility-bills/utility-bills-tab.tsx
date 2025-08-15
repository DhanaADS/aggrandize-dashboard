'use client';

import { useState } from 'react';
import { UtilityBill, UtilityBillFormData } from '@/types/finance';
import { createUtilityBill, updateUtilityBill } from '@/lib/finance-api';
import { UtilityBillForm } from './utility-bill-form';
import { UtilityBillList } from './utility-bill-list';
import styles from '../../payments.module.css';

export function UtilityBillsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddBill = () => {
    setEditingBill(null);
    setShowForm(true);
  };

  const handleEditBill = (bill: UtilityBill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBill(null);
  };

  const handleSubmitBill = async (billData: UtilityBillFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingBill) {
        await updateUtilityBill(editingBill.id, billData);
      } else {
        await createUtilityBill(billData);
      }
      
      setShowForm(false);
      setEditingBill(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving utility bill:', error);
      alert('Failed to save utility bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '1.5rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0'
          }}>
            Utility Bills Management
          </h2>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '0',
            fontSize: '0.95rem'
          }}>
            Track internet, electricity, water bills and other utilities
          </p>
        </div>
        <button 
          className={styles.button}
          onClick={handleAddBill}
          disabled={showForm}
        >
          + Add Utility Bill
        </button>
      </div>

      {/* Utility Bill Form */}
      {showForm && (
        <div style={{ marginBottom: '2rem' }}>
          <UtilityBillForm
            bill={editingBill ? {
              ...editingBill,
              payment_method_id: editingBill.payment_method_id
            } : undefined}
            onSubmit={handleSubmitBill}
            onCancel={handleCloseForm}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Utility Bill List */}
      <UtilityBillList 
        onEdit={handleEditBill}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
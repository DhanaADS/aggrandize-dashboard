'use client';

import { useState } from 'react';
import { Expense, ExpenseFormData } from '@/types/finance';
import { createExpense, updateExpense } from '@/lib/finance-api';
import { ExpenseForm } from './expense-form';
import { ExpenseList } from './expense-list';
import styles from '../../payments.module.css';

export function ExpensesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleSubmitExpense = async (expenseData: ExpenseFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await createExpense(expenseData);
      }
      
      setShowForm(false);
      setEditingExpense(null);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
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
            color: '#1f2937', 
            fontSize: '1.5rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0'
          }}>
            Expense Management
          </h2>
          <p style={{ 
            color: 'rgba(31, 41, 55, 0.6)',
            margin: '0',
            fontSize: '0.95rem'
          }}>
            Track daily expenses, settlements, and team payments
          </p>
        </div>
        <button 
          className={styles.button}
          onClick={handleAddExpense}
          disabled={showForm}
        >
          + Add Expense
        </button>
      </div>

      {/* Expense Form */}
      {showForm && (
        <div style={{ marginBottom: '2rem' }}>
          <ExpenseForm
            expense={editingExpense ? {
              ...editingExpense,
              category_id: editingExpense.category_id,
              payment_method_id: editingExpense.payment_method_id
            } : undefined}
            onSubmit={handleSubmitExpense}
            onCancel={handleCloseForm}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Expense List */}
      <ExpenseList 
        onEdit={handleEditExpense}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { Expense, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { updateExpense, deleteExpense, createExpense, getPaymentMethods, getExpenseCategories } from '@/lib/finance-api';
import styles from './financial-expenses.module.css';

interface OtherExpensesTableProps {
  expenses: Expense[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
}

export function OtherExpensesTable({ expenses, selectedMonth, isEditable, onRefresh }: OtherExpensesTableProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomPaymentMethod, setShowCustomPaymentMethod] = useState(false);
  const [showCustomPaidBy, setShowCustomPaidBy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Predefined payment method names
  const PAYMENT_METHOD_OPTIONS = [
    'Debit Card',
    'Credit Card', 
    'Office Hdfc Card',
    'Office Axis Card',
    'Net Banking',
    'Bank Transfer',
    'UPI',
    'Cash',
    'Office Card'
  ];

  const USER_OPTIONS = [...TEAM_MEMBERS, 'Office'];

  // Form state
  const [formData, setFormData] = useState({
    person_paid: '',
    purpose: '',
    amount_inr: '',
    payment_method_id: '',
    expense_date: '',
    notes: ''
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  useEffect(() => {
    if (showAddForm || showEditForm) {
      loadPaymentMethods();
    }
  }, [showAddForm, showEditForm]);

  // Click outside to close form
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowAddForm(false);
        setShowEditForm(false);
        setEditingExpense(null);
        resetForm();
      }
    };
    
    if (showAddForm || showEditForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddForm, showEditForm]);

  const loadPaymentMethods = async () => {
    try {
      const [methods, categories] = await Promise.all([
        getPaymentMethods(),
        getExpenseCategories()
      ]);
      setPaymentMethods(methods);
      setExpenseCategories(categories);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      person_paid: '',
      purpose: '',
      amount_inr: '',
      payment_method_id: '',
      expense_date: '',
      notes: ''
    });
    setShowCustomPaymentMethod(false);
    setShowCustomPaidBy(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.person_paid || !formData.purpose || !formData.amount_inr || !formData.payment_method_id || !formData.expense_date) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the 'other' category or use the first available category
      console.log('Available categories:', expenseCategories);
      const otherCategory = expenseCategories.find(cat => cat.type === 'other') || 
                           expenseCategories.find(cat => cat.name.toLowerCase().includes('other')) ||
                           expenseCategories[0];
      
      console.log('Selected category:', otherCategory);
      
      if (!otherCategory) {
        alert('No expense category found. Please contact administrator.');
        return;
      }

      // Handle payment method - if custom, find or create a generic "Other" payment method
      let paymentMethodId = formData.payment_method_id;
      if (showCustomPaymentMethod) {
        // For custom payment methods, use a generic "Other" payment method ID if available
        const otherPaymentMethod = paymentMethods.find(pm => pm.name === 'Other' || pm.name === 'Cash');
        if (otherPaymentMethod) {
          paymentMethodId = otherPaymentMethod.id;
        } else {
          alert('No generic payment method found. Please select a predefined payment method.');
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare notes - add custom payment method info if needed
      let notes = formData.notes;
      if (showCustomPaymentMethod && formData.payment_method_id) {
        notes = notes ? `${notes}\nPayment Method: ${formData.payment_method_id}` : `Payment Method: ${formData.payment_method_id}`;
      }

      const expenseData = {
        ...formData,
        amount_inr: parseFloat(formData.amount_inr),
        amount_usd: parseFloat(formData.amount_inr) / 83.5,
        category_id: otherCategory.id,
        payment_method_id: paymentMethodId,
        payment_status: 'pending' as const,
        notes: notes
      };
      
      console.log('Submitting expense data:', expenseData);
      console.log('Available categories:', expenseCategories);
      console.log('Available payment methods:', paymentMethods);
      console.log('Form state - showCustomPaymentMethod:', showCustomPaymentMethod);
      console.log('Raw form data before processing:', formData);

      if (editingExpense) {
        console.log('Updating existing expense:', editingExpense.id);
        await updateExpense(editingExpense.id, expenseData);
      } else {
        console.log('Creating new expense...');
        await createExpense(expenseData);
      }
      
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingExpense(null);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Error saving expense: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (expense) {
      setFormData({
        person_paid: expense.person_paid,
        purpose: expense.purpose,
        amount_inr: expense.amount_inr.toString(),
        payment_method_id: expense.payment_method_id,
        expense_date: expense.expense_date,
        notes: expense.notes || ''
      });
      setEditingExpense(expense);
      setShowEditForm(true);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!isEditable) return;
    
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      setIsUpdating(expenseId);
      await deleteExpense(expenseId);
      onRefresh();
    } catch (error) {
      console.error('Error deleting expense:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'approved': return '#3b82f6';
      case 'rejected': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid Back';
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount_inr, 0);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            📝 Other Expenses
          </h3>
          <p className={styles.subtitle}>
            {formatMonthDisplay(selectedMonth)}
          </p>
        </div>
        
        {isEditable && (
          <button 
            onClick={() => setShowAddForm(true)}
            className={styles.actionButton}
          >
            + Add Expense
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div>
          No other expenses recorded for {formatMonthDisplay(selectedMonth)}
          {isEditable && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => setShowAddForm(true)}
                className={styles.actionButton}
              >
                Add First Expense
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  PURPOSE
                </th>
                <th>
                  Notes
                </th>
                <th style={{textAlign: 'right'}}>
                  AMOUNT
                </th>
                <th style={{textAlign: 'center'}}>
                  Paid by
                </th>
                {isEditable && (
                  <th style={{textAlign: 'center'}}>
                    ACTIONS
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr key={expense.id}>
                  <td>
                    {expense.purpose}
                  </td>
                  <td>
                    {expense.notes || '—'}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <span>
                      {formatCurrency(expense.amount_inr)}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    {expense.person_paid}
                  </td>
                  {isEditable && (
                    <td style={{textAlign: 'center'}}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(expense.id)}
                          disabled={isUpdating === expense.id}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={isUpdating === expense.id}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {/* Total Row */}
              <tr className={styles.totalRow}>
                <td colSpan={2}>
                  TOTAL
                </td>
                <td className={styles.totalAmount} style={{textAlign: 'right'}}>
                  {formatCurrency(totalAmount)}
                </td>
                <td></td>
                {isEditable && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Expense Form */}
      {(showAddForm || showEditForm) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div ref={formRef} style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: '700',
                margin: 0,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                📝 {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingExpense(null);
                  resetForm();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Person Paid */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Paid By *
                </label>
                {showCustomPaidBy ? (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.person_paid}
                      onChange={(e) => setFormData({...formData, person_paid: e.target.value})}
                      placeholder="Enter custom name"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: '#ffffff',
                        fontSize: '0.9rem'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomPaidBy(false);
                        setFormData({...formData, person_paid: ''});
                      }}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        color: '#ef4444',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.7rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.person_paid}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomPaidBy(true);
                        setFormData({...formData, person_paid: ''});
                      } else {
                        setFormData({...formData, person_paid: e.target.value});
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }}
                    required
                  >
                    <option value="">✓ Select team member</option>
                    {USER_OPTIONS.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                    <option value="custom">✏️ Custom (Enter manually)</option>
                  </select>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Purpose *
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  placeholder="e.g., Office supplies, Processing costs"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Amount (INR) *
                </label>
                <input
                  type="number"
                  value={formData.amount_inr}
                  onChange={(e) => setFormData({...formData, amount_inr: e.target.value})}
                  placeholder="Enter amount in rupees"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Payment Method *
                </label>
                {showCustomPaymentMethod ? (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.payment_method_id}
                      onChange={(e) => setFormData({...formData, payment_method_id: e.target.value})}
                      placeholder="Enter custom payment method"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: '#ffffff',
                        fontSize: '0.9rem'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomPaymentMethod(false);
                        setFormData({...formData, payment_method_id: ''});
                      }}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        color: '#ef4444',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.7rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.payment_method_id}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomPaymentMethod(true);
                        setFormData({...formData, payment_method_id: ''});
                      } else {
                        setFormData({...formData, payment_method_id: e.target.value});
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }}
                    required
                  >
                    <option value="">✓ Select payment method</option>
                    {PAYMENT_METHOD_OPTIONS.map(methodName => {
                      const method = paymentMethods.find(m => m.name === methodName);
                      return method ? (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ) : (
                        <option key={methodName} value={methodName}>{methodName}</option>
                      );
                    })}
                    <option value="custom">✏️ Custom (Enter manually)</option>
                  </select>
                )}
              </div>

              {/* Expense Date */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details about the expense"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: isSubmitting 
                    ? 'rgba(148, 163, 184, 0.3)' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '0.875rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  marginTop: '0.5rem'
                }}
              >
                {isSubmitting ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.5rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        fontSize: '0.85rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
      }}>
        💡 {isEditable 
          ? 'Track one-time and variable expenses like office supplies, stamps, processing costs, etc. Only current month data can be modified.'
          : 'This is historical expense data from a previous month and cannot be modified.'
        }
      </div>
    </div>
  );
}
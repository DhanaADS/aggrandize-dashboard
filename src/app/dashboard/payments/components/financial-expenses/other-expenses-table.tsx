'use client';

import { useState, useEffect, useRef } from 'react';
import { Expense, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { updateExpense, deleteExpense, createExpense, getPaymentMethods, getExpenseCategories } from '@/lib/finance-api';
import styles from '../../payments.module.css';

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
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.4) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      borderRadius: '24px',
      padding: '2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div>
          <h3 style={{ 
            color: '#ffffff', 
            fontSize: '1.25rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📝 Other Expenses
          </h3>
          <p style={{
            color: 'rgba(148, 163, 184, 0.8)',
            fontSize: '0.9rem',
            margin: '0',
            fontWeight: '500'
          }}>
            {formatMonthDisplay(selectedMonth)}
          </p>
        </div>
        
        {isEditable && (
          <button 
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            + Add Expense
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem',
          fontStyle: 'italic'
        }}>
          No other expenses recorded for {formatMonthDisplay(selectedMonth)}
          {isEditable && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => setShowAddForm(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                Add First Expense
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            background: 'transparent'
          }}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'left', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  PURPOSE
                </th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'left', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Notes
                </th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'right', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  AMOUNT
                </th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.75rem 1rem', 
                  textAlign: 'center', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Paid by
                </th>
                {isEditable && (
                  <th style={{ 
                    color: '#3b82f6', 
                    padding: '0.75rem 1rem', 
                    textAlign: 'center', 
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    ACTIONS
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr 
                  key={expense.id} 
                  style={{ 
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                    transition: 'all 0.2s ease',
                    background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', color: '#ffffff', fontWeight: '600' }}>
                    {expense.purpose}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.85rem' }}>
                    {expense.notes || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                      color: '#00ff88',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 255, 136, 0.2)',
                      fontSize: '0.9rem',
                      fontWeight: '700'
                    }}>
                      {formatCurrency(expense.amount_inr)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#ffffff', fontWeight: '600' }}>
                    {expense.person_paid}
                  </td>
                  {isEditable && (
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(expense.id)}
                          disabled={isUpdating === expense.id}
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '0.25rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={isUpdating === expense.id}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.25rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {/* Total Row */}
              <tr style={{ 
                borderTop: '2px solid rgba(59, 130, 246, 0.3)', 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                fontWeight: 'bold'
              }}>
                <td colSpan={2} style={{ 
                  color: '#ffffff', 
                  padding: '0.75rem 1rem', 
                  fontSize: '1.1rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#3b82f6'
                    }}></div>
                    TOTAL
                  </div>
                </td>
                <td style={{ 
                  padding: '0.75rem 1rem', 
                  fontSize: '1.2rem', 
                  fontWeight: '800', 
                  textAlign: 'right'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    display: 'inline-block',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                  }}>
                    {formatCurrency(totalAmount)}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}></td>
                {isEditable && <td style={{ padding: '0.75rem 1rem' }}></td>}
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
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.08) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        fontSize: '0.85rem',
        color: 'rgba(148, 163, 184, 0.9)',
        fontWeight: '500',
        backdropFilter: 'blur(10px)'
      }}>
        💡 {isEditable 
          ? 'Track one-time and variable expenses like office supplies, stamps, processing costs, etc. Only current month data can be modified.'
          : 'This is historical expense data from a previous month and cannot be modified.'
        }
      </div>
    </div>
  );
}
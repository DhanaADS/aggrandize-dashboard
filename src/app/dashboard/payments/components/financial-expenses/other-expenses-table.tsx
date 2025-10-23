'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Expense, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { updateExpense, deleteExpense, createExpense, getPaymentMethods, getExpenseCategories } from '@/lib/finance-api';
import styles from './expenses-minimal.module.css';

interface OtherExpensesTableProps {
  expenses: Expense[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
}

interface OtherExpensesTableRef {
  showAddForm: () => void;
}

export const OtherExpensesTable = forwardRef<OtherExpensesTableRef, OtherExpensesTableProps>(
  ({ expenses, selectedMonth, isEditable, onRefresh }, ref) => {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true)
  }));
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
    <>

      {expenses.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
          <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>No Other Expenses</div>
          <div style={{ fontSize: '0.875rem' }}>
            No other expenses recorded for {formatMonthDisplay(selectedMonth)}
          </div>
        </div>
      ) : (
        <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Purpose</th>
                <th className={styles.tableHeadCell}>Notes</th>
                <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>Amount</th>
                <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Paid by</th>
                {isEditable && (
                  <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr key={expense.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.fontBold}`}>
                    {expense.purpose}
                  </td>
                  <td className={`${styles.tableCell} ${styles.textMuted}`}>
                    {expense.notes || '—'}
                  </td>
                  <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                    <span className={styles.amountDisplay}>
                      {formatCurrency(expense.amount_inr)}
                    </span>
                  </td>
                  <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                    <span className={styles.paidByDisplay}>
                      {expense.person_paid}
                    </span>
                  </td>
                  {isEditable && (
                    <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                      <div className={`${styles.flex} ${styles.flexGapHalf} ${styles.flexJustifyCenter}`}>
                        <button
                          onClick={() => handleEdit(expense.id)}
                          disabled={isUpdating === expense.id}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={isUpdating === expense.id}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              <tr className={styles.totalRow}>
                <td colSpan={2} className={`${styles.tableCell} ${styles.fontBold}`}>
                  <div className={`${styles.flex} ${styles.flexAlignCenter} ${styles.flexGapHalf}`}>
                    <div className={`${styles.statusDot} ${styles.statusDotActive}`}></div>
                    TOTAL
                  </div>
                </td>
                <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.fontBold}`}>
                  <span className={styles.amountDisplay}>
                    {formatCurrency(totalAmount)}
                  </span>
                </td>
                <td className={styles.tableCell}></td>
                {isEditable && <td className={styles.tableCell}></td>}
              </tr>
            </tbody>
          </table>
      )}

      {/* Add/Edit Expense Form */}
      {(showAddForm || showEditForm) && (
        <div className={styles.formOverlay}>
          <div ref={formRef} className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>
                📝 {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingExpense(null);
                  resetForm();
                }}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              {/* Person Paid */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Paid By *
                </label>
                {showCustomPaidBy ? (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.person_paid}
                      onChange={(e) => setFormData({...formData, person_paid: e.target.value})}
                      placeholder="Enter custom name"
                      className={styles.formInput}
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
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
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
                    className={styles.formSelect}
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
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Purpose *
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  placeholder="e.g., Office supplies, Processing costs"
                  className={styles.formInput}
                  required
                />
              </div>

              {/* Amount */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Amount (INR) *
                </label>
                <input
                  type="number"
                  value={formData.amount_inr}
                  onChange={(e) => setFormData({...formData, amount_inr: e.target.value})}
                  placeholder="Enter amount in rupees"
                  step="0.01"
                  min="0"
                  className={styles.formInput}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Payment Method *
                </label>
                {showCustomPaymentMethod ? (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.payment_method_id}
                      onChange={(e) => setFormData({...formData, payment_method_id: e.target.value})}
                      placeholder="Enter custom payment method"
                      className={styles.formInput}
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
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
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
                    className={styles.formSelect}
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
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  className={styles.formInput}
                  required
                />
              </div>

              {/* Notes */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details about the expense"
                  rows={3}
                  className={styles.formTextarea}
                />
              </div>

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
});

OtherExpensesTable.displayName = 'OtherExpensesTable';
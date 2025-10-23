'use client';

import { useState, useEffect } from 'react';
import { ExpenseFormData, ExpenseCategory, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getExpenseCategories, getPaymentMethods, createExpense, updateExpense } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface ExpenseFormProps {
  expense?: ExpenseFormData & { id?: string };
  onSubmit: (expense: ExpenseFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({ expense, onSubmit, onCancel, isSubmitting }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount_inr: 0,
    amount_usd: 0,
    category_id: '',
    person_paid: '',
    person_responsible: '',
    purpose: '',
    payment_method_id: '',
    payment_status: 'pending',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Exchange rate (mock - in real app, fetch from API)
  const USD_TO_INR_RATE = 83.5;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, methodsData] = await Promise.all([
          getExpenseCategories(),
          getPaymentMethods()
        ]);
        setCategories(categoriesData);
        setPaymentMethods(methodsData);
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    }
  }, [expense]);

  const handleInputChange = (field: keyof ExpenseFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-convert currency
    if (field === 'amount_inr' && typeof value === 'number') {
      setFormData(prev => ({
        ...prev,
        amount_inr: value,
        amount_usd: Number((value / USD_TO_INR_RATE).toFixed(2))
      }));
    } else if (field === 'amount_usd' && typeof value === 'number') {
      setFormData(prev => ({
        ...prev,
        amount_usd: value,
        amount_inr: Number((value * USD_TO_INR_RATE).toFixed(2))
      }));
    }

    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount_inr || formData.amount_inr <= 0) {
      newErrors.amount_inr = 'Amount is required and must be greater than 0';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    if (!formData.person_paid) {
      newErrors.person_paid = 'Person who paid is required';
    }
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'Payment method is required';
    }
    if (!formData.expense_date) {
      newErrors.expense_date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <p style={{ color: 'rgba(31, 41, 55, 0.6)', textAlign: 'center' }}>
          Loading form...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 style={{ 
        color: '#1f2937', 
        fontSize: '1.1rem', 
        fontWeight: '600',
        margin: '0 0 1.5rem 0'
      }}>
        {expense?.id ? 'Edit Expense' : 'Add New Expense'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {/* Amount INR */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              className={styles.input}
              value={formData.amount_inr || ''}
              onChange={(e) => handleInputChange('amount_inr', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              style={{ borderColor: errors.amount_inr ? '#ef4444' : undefined }}
            />
            {errors.amount_inr && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.amount_inr}
              </div>
            )}
          </div>

          {/* Amount USD */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              className={styles.input}
              value={formData.amount_usd || ''}
              onChange={(e) => handleInputChange('amount_usd', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <div style={{ color: 'rgba(31, 41, 55, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Auto-converted (Rate: 1 USD = ₹{USD_TO_INR_RATE})
            </div>
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Category *
            </label>
            <select
              className={styles.select}
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              style={{ borderColor: errors.category_id ? '#ef4444' : undefined }}
            >
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.category_id}
              </div>
            )}
          </div>

          {/* Person Paid */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Person Who Paid *
            </label>
            <select
              className={styles.select}
              value={formData.person_paid}
              onChange={(e) => handleInputChange('person_paid', e.target.value)}
              style={{ borderColor: errors.person_paid ? '#ef4444' : undefined }}
            >
              <option value="">Select person</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            {errors.person_paid && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.person_paid}
              </div>
            )}
          </div>

          {/* Person Responsible */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Person Responsible
            </label>
            <select
              className={styles.select}
              value={formData.person_responsible || ''}
              onChange={(e) => handleInputChange('person_responsible', e.target.value)}
            >
              <option value="">Same as who paid</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Payment Method *
            </label>
            <select
              className={styles.select}
              value={formData.payment_method_id}
              onChange={(e) => handleInputChange('payment_method_id', e.target.value)}
              style={{ borderColor: errors.payment_method_id ? '#ef4444' : undefined }}
            >
              <option value="">Select payment method</option>
              {paymentMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
            {errors.payment_method_id && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.payment_method_id}
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Payment Status
            </label>
            <select
              className={styles.select}
              value={formData.payment_status}
              onChange={(e) => handleInputChange('payment_status', e.target.value as any)}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Date */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Date *
            </label>
            <input
              type="date"
              className={styles.input}
              value={formData.expense_date}
              onChange={(e) => handleInputChange('expense_date', e.target.value)}
              style={{ borderColor: errors.expense_date ? '#ef4444' : undefined }}
            />
            {errors.expense_date && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.expense_date}
              </div>
            )}
          </div>
        </div>

        {/* Purpose */}
        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
          <label className={styles.label}>
            Purpose/Description *
          </label>
          <input
            type="text"
            className={styles.input}
            value={formData.purpose}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            placeholder="Describe the expense"
            style={{ borderColor: errors.purpose ? '#ef4444' : undefined }}
          />
          {errors.purpose && (
            <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {errors.purpose}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Notes
          </label>
          <textarea
            className={styles.textarea}
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes (optional)"
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'flex-end',
          marginTop: '2rem'
        }}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.buttonSecondary}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (expense?.id ? 'Update Expense' : 'Add Expense')}
          </button>
        </div>
      </form>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { SalaryFormData, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getPaymentMethods } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface SalaryFormProps {
  salary?: SalaryFormData & { id?: string };
  onSubmit: (salary: SalaryFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SalaryForm({ salary, onSubmit, onCancel, isSubmitting }: SalaryFormProps) {
  const [formData, setFormData] = useState<SalaryFormData>({
    employee_name: '',
    amount_inr: 0,
    amount_usd: 0,
    payment_method_id: '',
    payment_status: 'pending',
    salary_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    payment_date: '',
    salary_type: 'monthly',
    notes: ''
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Exchange rate
  const USD_TO_INR_RATE = 83.5;

  useEffect(() => {
    const loadData = async () => {
      try {
        const methodsData = await getPaymentMethods();
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
    if (salary) {
      setFormData(salary);
    }
  }, [salary]);

  const handleInputChange = (field: keyof SalaryFormData, value: string | number) => {
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

    if (!formData.employee_name) {
      newErrors.employee_name = 'Employee name is required';
    }
    if (!formData.amount_inr || formData.amount_inr <= 0) {
      newErrors.amount_inr = 'Amount is required and must be greater than 0';
    }
    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'Payment method is required';
    }
    if (!formData.salary_month) {
      newErrors.salary_month = 'Salary month is required';
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
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
          Loading form...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 style={{ 
        color: '#ffffff', 
        fontSize: '1.1rem', 
        fontWeight: '600',
        margin: '0 0 1.5rem 0'
      }}>
        {salary?.id ? 'Edit Salary Payment' : 'Add New Salary Payment'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {/* Employee Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Employee Name *
            </label>
            <select
              className={styles.select}
              value={formData.employee_name}
              onChange={(e) => handleInputChange('employee_name', e.target.value)}
              style={{ borderColor: errors.employee_name ? '#ef4444' : undefined }}
            >
              <option value="">Select employee</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            {errors.employee_name && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.employee_name}
              </div>
            )}
          </div>

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
            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Auto-converted (Rate: 1 USD = ₹{USD_TO_INR_RATE})
            </div>
          </div>

          {/* Salary Type */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Salary Type
            </label>
            <select
              className={styles.select}
              value={formData.salary_type}
              onChange={(e) => handleInputChange('salary_type', e.target.value as any)}
            >
              <option value="monthly">Monthly Salary</option>
              <option value="bonus">Bonus</option>
              <option value="advance">Advance Payment</option>
              <option value="deduction">Deduction</option>
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
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Salary Month */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Salary Month *
            </label>
            <input
              type="month"
              className={styles.input}
              value={formData.salary_month}
              onChange={(e) => handleInputChange('salary_month', e.target.value)}
              style={{ borderColor: errors.salary_month ? '#ef4444' : undefined }}
            />
            {errors.salary_month && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.salary_month}
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Payment Date
            </label>
            <input
              type="date"
              className={styles.input}
              value={formData.payment_date || ''}
              onChange={(e) => handleInputChange('payment_date', e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
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
            {isSubmitting ? 'Saving...' : (salary?.id ? 'Update Salary' : 'Add Salary')}
          </button>
        </div>
      </form>
    </div>
  );
}
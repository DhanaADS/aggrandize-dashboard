'use client';

import { useState, useEffect } from 'react';
import { UtilityBillFormData, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getPaymentMethods } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface UtilityBillFormProps {
  bill?: UtilityBillFormData & { id?: string };
  onSubmit: (bill: UtilityBillFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const BILL_TYPES = [
  { value: 'internet', label: '🌐 Internet' },
  { value: 'electricity', label: '⚡ Electricity (EB Bill)' },
  { value: 'water', label: '💧 Water' },
  { value: 'gas', label: '🔥 Gas' },
  { value: 'phone', label: '📞 Phone' },
  { value: 'other', label: '📋 Other' }
];

const COMMON_PROVIDERS = {
  internet: ['ACT Fibernet', 'Airtel Xstream', 'BSNL', 'Jio Fiber', 'Hathway'],
  electricity: ['TNEB', 'BESCOM', 'KSEB', 'MSEB', 'Local EB'],
  water: ['Metro Water', 'Municipal Corporation', 'Private Supplier'],
  gas: ['HP Gas', 'Bharat Gas', 'Indane Gas', 'Local Supplier'],
  phone: ['Airtel', 'Jio', 'Vi', 'BSNL'],
  other: []
};

export function UtilityBillForm({ bill, onSubmit, onCancel, isSubmitting }: UtilityBillFormProps) {
  const [formData, setFormData] = useState<UtilityBillFormData>({
    bill_type: 'internet',
    provider_name: '',
    amount_inr: 0,
    amount_usd: 0,
    payment_method_id: '',
    payment_status: 'pending',
    bill_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    due_date: '',
    payment_date: '',
    bill_number: '',
    usage_details: '',
    notes: '',
    paid_by: ''
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
    if (bill) {
      setFormData(bill);
    }
  }, [bill]);

  const handleInputChange = (field: keyof UtilityBillFormData, value: string | number) => {
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

    if (!formData.bill_type) {
      newErrors.bill_type = 'Bill type is required';
    }
    if (!formData.provider_name.trim()) {
      newErrors.provider_name = 'Provider name is required';
    }
    if (!formData.amount_inr || formData.amount_inr <= 0) {
      newErrors.amount_inr = 'Amount is required and must be greater than 0';
    }
    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'Payment method is required';
    }
    if (!formData.bill_month) {
      newErrors.bill_month = 'Bill month is required';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
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

  const getCurrentProviders = () => {
    return COMMON_PROVIDERS[formData.bill_type as keyof typeof COMMON_PROVIDERS] || [];
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
        {bill?.id ? 'Edit Utility Bill' : 'Add New Utility Bill'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {/* Bill Type */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Bill Type *
            </label>
            <select
              className={styles.select}
              value={formData.bill_type}
              onChange={(e) => handleInputChange('bill_type', e.target.value as any)}
              style={{ borderColor: errors.bill_type ? '#ef4444' : undefined }}
            >
              {BILL_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.bill_type && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.bill_type}
              </div>
            )}
          </div>

          {/* Provider Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Provider Name *
            </label>
            {getCurrentProviders().length > 0 ? (
              <select
                className={styles.select}
                value={formData.provider_name}
                onChange={(e) => handleInputChange('provider_name', e.target.value)}
                style={{ borderColor: errors.provider_name ? '#ef4444' : undefined }}
              >
                <option value="">Select provider</option>
                {getCurrentProviders().map(provider => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
                <option value="custom">Other (Custom)</option>
              </select>
            ) : (
              <input
                type="text"
                className={styles.input}
                value={formData.provider_name}
                onChange={(e) => handleInputChange('provider_name', e.target.value)}
                placeholder="Enter provider name"
                style={{ borderColor: errors.provider_name ? '#ef4444' : undefined }}
              />
            )}
            {errors.provider_name && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.provider_name}
              </div>
            )}
          </div>

          {/* Custom Provider (if other selected) */}
          {formData.provider_name === 'custom' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Custom Provider Name *
              </label>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter custom provider name"
                onChange={(e) => handleInputChange('provider_name', e.target.value)}
              />
            </div>
          )}

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

          {/* Paid By */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Paid By
            </label>
            <select
              className={styles.select}
              value={formData.paid_by || ''}
              onChange={(e) => handleInputChange('paid_by', e.target.value)}
              style={{ borderColor: errors.paid_by ? '#ef4444' : undefined }}
            >
              <option value="">Select team member</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            {errors.paid_by && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.paid_by}
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
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Bill Month */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Bill Month *
            </label>
            <input
              type="month"
              className={styles.input}
              value={formData.bill_month}
              onChange={(e) => handleInputChange('bill_month', e.target.value)}
              style={{ borderColor: errors.bill_month ? '#ef4444' : undefined }}
            />
            {errors.bill_month && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.bill_month}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Due Date *
            </label>
            <input
              type="date"
              className={styles.input}
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              style={{ borderColor: errors.due_date ? '#ef4444' : undefined }}
            />
            {errors.due_date && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.due_date}
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

          {/* Bill Number */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Bill Number
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.bill_number || ''}
              onChange={(e) => handleInputChange('bill_number', e.target.value)}
              placeholder="Enter bill number"
            />
          </div>

          {/* Usage Details */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Usage Details
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.usage_details || ''}
              onChange={(e) => handleInputChange('usage_details', e.target.value)}
              placeholder="e.g., 500 GB, 150 units"
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
            {isSubmitting ? 'Saving...' : (bill?.id ? 'Update Bill' : 'Add Bill')}
          </button>
        </div>
      </form>
    </div>
  );
}
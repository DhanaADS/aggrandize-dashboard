'use client';

import { useState, useEffect, useRef } from 'react';
import { SubscriptionFormData, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getPaymentMethods } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface SubscriptionFormProps {
  subscription?: SubscriptionFormData & { id?: string };
  onSubmit: (subscription: SubscriptionFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const SUBSCRIPTION_CATEGORIES = [
  'Design Tools',
  'Development Tools',
  'Hosting/Domain',
  'AI Services',
  'Marketing Tools',
  'Communication',
  'Productivity',
  'Security',
  'Analytics',
  'Storage',
  'Other'
];

const COMMON_PLATFORMS = [
  'Canva',
  'Namecheap', 
  'GoDaddy',
  'Open AI',
  'CURSOR AI',
  'X CORP',
  'ACT',
  'irconnectindi',
  'Skylink',
  'BHW',
  'Leapswitch',
  'GSuit',
  'Perplexity AI',
  'Kling',
  'Google one',
  'Adobe Creative Suite',
  'Figma',
  'GitHub',
  'Vercel',
  'Netlify',
  'Hostinger',
  'AWS',
  'Google Workspace',
  'Microsoft 365',
  'Slack',
  'Zoom',
  'Notion',
  'Airtable',
  'Mailchimp',
  'HubSpot'
];

export function SubscriptionForm({ subscription, onSubmit, onCancel, isSubmitting }: SubscriptionFormProps) {
  const [formData, setFormData] = useState<SubscriptionFormData>({
    platform: '',
    plan_type: '',
    purpose: '',
    amount_inr: 0,
    amount_usd: 0,
    payment_method_id: '',
    renewal_cycle: 'Monthly',
    due_date: '',
    next_due_date: '',
    auto_renewal: false,
    is_active: true,
    category: 'Other',
    notes: '',
    used_by: '',
    paid_by: ''
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const USER_OPTIONS = [...TEAM_MEMBERS, 'Office'];

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
    if (subscription) {
      setFormData(subscription);
    }
  }, [subscription]);

  // Click outside to close form
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleInputChange = (field: keyof SubscriptionFormData, value: string | number | boolean) => {
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

    // Auto-calculate next due date based on renewal cycle and due date
    if ((field === 'due_date' || field === 'renewal_cycle') && formData.due_date) {
      const dueDate = new Date(field === 'due_date' ? value as string : formData.due_date);
      const renewalCycle = field === 'renewal_cycle' ? value as string : formData.renewal_cycle;
      
      const nextDueDate = new Date(dueDate);
      switch (renewalCycle) {
        case 'Monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'Quarterly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case 'Yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }
      
      setFormData(prev => ({
        ...prev,
        next_due_date: nextDueDate.toISOString().split('T')[0]
      }));
    }

    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.platform.trim()) {
      newErrors.platform = 'Platform is required';
    }
    if (!formData.plan_type.trim()) {
      newErrors.plan_type = 'Plan type is required';
    }
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    if (!formData.amount_inr || formData.amount_inr <= 0) {
      newErrors.amount_inr = 'Amount is required and must be greater than 0';
    }
    if (!formData.payment_method_id) {
      newErrors.payment_method_id = 'Payment method is required';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form data before validation:', formData);
    if (validateForm()) {
      console.log('Form validation passed, submitting:', formData);
      onSubmit(formData);
    } else {
      console.log('Form validation failed, errors:', errors);
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
    <div ref={formRef} style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '20px',
      padding: '2rem',
      maxWidth: '800px',
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
          🔄 {subscription?.id ? 'Edit Subscription' : 'Add New Subscription'}
        </h3>
        <button
          onClick={onCancel}
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

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {/* Platform */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Platform/Service *
            </label>
            <select
              className={styles.select}
              value={COMMON_PLATFORMS.includes(formData.platform) ? formData.platform : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  handleInputChange('platform', '');
                } else {
                  handleInputChange('platform', e.target.value);
                }
              }}
              style={{ borderColor: errors.platform ? '#ef4444' : undefined }}
            >
              <option value="">Select platform</option>
              {COMMON_PLATFORMS.map(platform => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
              <option value="custom">Other (Custom)</option>
            </select>
            {(!COMMON_PLATFORMS.includes(formData.platform) || formData.platform === '') && (
              <input
                type="text"
                className={styles.input}
                value={formData.platform}
                onChange={(e) => handleInputChange('platform', e.target.value)}
                placeholder="Enter custom platform name"
                style={{ marginTop: '0.5rem', borderColor: errors.platform ? '#ef4444' : undefined }}
              />
            )}
            {errors.platform && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.platform}
              </div>
            )}
          </div>

          {/* Plan Type */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Plan Type *
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.plan_type}
              onChange={(e) => handleInputChange('plan_type', e.target.value)}
              placeholder="e.g., Pro, Business, Premium"
              style={{ borderColor: errors.plan_type ? '#ef4444' : undefined }}
            />
            {errors.plan_type && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.plan_type}
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Purpose *
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="e.g., Design, Development, Marketing"
              style={{ borderColor: errors.purpose ? '#ef4444' : undefined }}
            />
            {errors.purpose && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.purpose}
              </div>
            )}
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Category *
            </label>
            <select
              className={styles.select}
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              style={{ borderColor: errors.category ? '#ef4444' : undefined }}
            >
              {SUBSCRIPTION_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.category}
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

          {/* Renewal Cycle */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Renewal Cycle
            </label>
            <select
              className={styles.select}
              value={formData.renewal_cycle}
              onChange={(e) => handleInputChange('renewal_cycle', e.target.value as 'Monthly' | 'Quarterly' | 'Yearly')}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>

          {/* Due Date */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Next Due Date *
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

          {/* Next Due Date (Auto-calculated) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Following Due Date
            </label>
            <input
              type="date"
              className={styles.input}
              value={formData.next_due_date}
              onChange={(e) => handleInputChange('next_due_date', e.target.value)}
              style={{ opacity: 0.7 }}
            />
            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Auto-calculated based on renewal cycle
            </div>
          </div>

          {/* Used By */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Used By
            </label>
            <select
              className={styles.select}
              value={formData.used_by || ''}
              onChange={(e) => handleInputChange('used_by', e.target.value)}
            >
              <option value="">Select team member</option>
              {USER_OPTIONS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
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
            >
              <option value="">Select team member</option>
              {USER_OPTIONS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '1rem' }}>
          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <input
                type="checkbox"
                checked={formData.auto_renewal}
                onChange={(e) => handleInputChange('auto_renewal', e.target.checked)}
                style={{ margin: 0 }}
              />
              Auto-renewal enabled
            </label>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                style={{ margin: 0 }}
              />
              Active subscription
            </label>
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
            {isSubmitting ? 'Saving...' : (subscription?.id ? 'Update Subscription' : 'Add Subscription')}
          </button>
        </div>
      </form>
    </div>
  );
}
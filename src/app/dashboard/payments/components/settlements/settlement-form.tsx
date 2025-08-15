'use client';

import { useState, useEffect } from 'react';
import { SettlementFormData, TEAM_MEMBERS } from '@/types/finance';
import styles from '../../payments.module.css';

interface SettlementFormProps {
  settlement?: SettlementFormData & { id?: string };
  onSubmit: (settlement: SettlementFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SettlementForm({ settlement, onSubmit, onCancel, isSubmitting }: SettlementFormProps) {
  const [formData, setFormData] = useState<SettlementFormData>({
    from_person: '',
    to_person: '',
    amount_inr: 0,
    purpose: '',
    settlement_status: 'pending',
    settlement_date: '',
    related_expense_id: '',
    related_subscription_id: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settlement) {
      setFormData(settlement);
    }
  }, [settlement]);

  const handleInputChange = (field: keyof SettlementFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.from_person) {
      newErrors.from_person = 'Required';
    }
    if (!formData.to_person) {
      newErrors.to_person = 'Required';
    }
    if (formData.from_person === formData.to_person) {
      newErrors.to_person = 'Cannot be same person';
    }
    if (!formData.amount_inr || formData.amount_inr <= 0) {
      newErrors.amount_inr = 'Required';
    }
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Required';
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

  return (
    <div className={styles.card}>
      <h3 style={{ 
        color: '#ffffff', 
        fontSize: '1.1rem', 
        fontWeight: '600',
        margin: '0 0 1.5rem 0'
      }}>
        {settlement?.id ? 'Edit Settlement' : 'Add Settlement'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* From Person */}
          <div className={styles.formGroup}>
            <label className={styles.label}>From *</label>
            <select
              className={styles.select}
              value={formData.from_person}
              onChange={(e) => handleInputChange('from_person', e.target.value)}
              style={{ borderColor: errors.from_person ? '#ef4444' : undefined }}
            >
              <option value="">Select person</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
            {errors.from_person && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.from_person}
              </div>
            )}
          </div>

          {/* To Person */}
          <div className={styles.formGroup}>
            <label className={styles.label}>To *</label>
            <select
              className={styles.select}
              value={formData.to_person}
              onChange={(e) => handleInputChange('to_person', e.target.value)}
              style={{ borderColor: errors.to_person ? '#ef4444' : undefined }}
            >
              <option value="">Select person</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
            {errors.to_person && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.to_person}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Amount (₹) *</label>
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

          {/* Purpose */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Purpose *</label>
            <input
              type="text"
              className={styles.input}
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Settlement purpose"
              style={{ borderColor: errors.purpose ? '#ef4444' : undefined }}
            />
            {errors.purpose && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.purpose}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'flex-end',
          marginTop: '1.5rem'
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
            {isSubmitting ? 'Saving...' : (settlement?.id ? 'Update' : 'Add')}
          </button>
        </div>
      </form>
    </div>
  );
}
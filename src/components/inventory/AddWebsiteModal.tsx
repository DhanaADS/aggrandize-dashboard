'use client';

import React, { useState, useEffect } from 'react';
import { WebsiteInventory, WebsiteFormData } from '@/types/inventory';
import inventoryApi from '@/lib/inventory-api';
import styles from './inventory-components.module.css';

interface AddWebsiteModalProps {
  website?: WebsiteInventory | null;
  onClose: () => void;
  onWebsiteAdd?: () => void;
  onWebsiteUpdate?: () => void;
}

const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({
  website,
  onClose,
  onWebsiteAdd,
  onWebsiteUpdate
}) => {
  const [formData, setFormData] = useState<WebsiteFormData>({
    website: '',
    contact: '',
    client_price: null,
    price: null,
    domain_rating: null,
    da: null,
    backlinks: null,
    organic_traffic: null,
    us_traffic: null,
    uk_traffic: null,
    canada_traffic: null,
    is_indexed: true,
    ai_overview: false,
    chatgpt: false,
    perplexity: false,
    gemini: false,
    copilot: false,
    do_follow: false,
    news: false,
    sponsored: false,
    cbd: false,
    casino: false,
    dating: false,
    crypto: false,
    category: '',
    tat: null,
    status: 'active',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);

  const isEditing = Boolean(website);

  // Load form data for editing
  useEffect(() => {
    if (website) {
      setFormData({
        website: website.website,
        contact: website.contact || '',
        client_price: website.client_price,
        price: website.price,
        domain_rating: website.domain_rating,
        da: website.da,
        backlinks: website.backlinks,
        organic_traffic: website.organic_traffic,
        us_traffic: website.us_traffic,
        uk_traffic: website.uk_traffic,
        canada_traffic: website.canada_traffic,
        is_indexed: website.is_indexed,
        ai_overview: website.ai_overview,
        chatgpt: website.chatgpt,
        perplexity: website.perplexity,
        gemini: website.gemini,
        copilot: website.copilot,
        do_follow: website.do_follow,
        news: website.news,
        sponsored: website.sponsored,
        cbd: website.cbd,
        casino: website.casino,
        dating: website.dating,
        crypto: website.crypto,
        category: website.category || '',
        tat: website.tat,
        status: website.status,
        notes: website.notes || ''
      });
    }
  }, [website]);

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [categoriesData, contactsData] = await Promise.all([
          inventoryApi.getCategories(),
          inventoryApi.getContacts()
        ]);
        setCategories(categoriesData);
        setContacts(contactsData);
      } catch (error) {
        console.error('Failed to load options:', error);
      }
    };

    loadOptions();
  }, []);

  // Handle form field changes
  const handleChange = (key: keyof WebsiteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.website.trim()) {
      newErrors.website = 'Website URL is required';
    } else {
      // Basic URL validation
      const cleanedWebsite = formData.website.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
      if (!urlPattern.test(cleanedWebsite)) {
        newErrors.website = 'Please enter a valid website URL (e.g., example.com)';
      }
    }

    // Numeric field validations
    if (formData.domain_rating !== null && (formData.domain_rating < 0 || formData.domain_rating > 100)) {
      newErrors.domain_rating = 'Domain Rating must be between 0-100';
    }

    if (formData.da !== null && (formData.da < 0 || formData.da > 100)) {
      newErrors.da = 'Domain Authority must be between 0-100';
    }

    if (formData.backlinks !== null && formData.backlinks < 0) {
      newErrors.backlinks = 'Backlinks cannot be negative';
    }

    if (formData.organic_traffic !== null && formData.organic_traffic < 0) {
      newErrors.organic_traffic = 'Traffic cannot be negative';
    }

    if (formData.us_traffic !== null && formData.us_traffic < 0) {
      newErrors.us_traffic = 'Traffic cannot be negative';
    }

    if (formData.uk_traffic !== null && formData.uk_traffic < 0) {
      newErrors.uk_traffic = 'Traffic cannot be negative';
    }

    if (formData.canada_traffic !== null && formData.canada_traffic < 0) {
      newErrors.canada_traffic = 'Traffic cannot be negative';
    }

    if (formData.client_price !== null && formData.client_price < 0) {
      newErrors.client_price = 'Price cannot be negative';
    }

    if (formData.price !== null && formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.tat !== null && (formData.tat < 0 || formData.tat > 365)) {
      newErrors.tat = 'TAT must be between 0-365 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing && website) {
        await inventoryApi.updateWebsite(website.id, formData);
        onWebsiteUpdate?.();
      } else {
        await inventoryApi.createWebsite(formData);
        onWebsiteAdd?.();
      }
      onClose();
    } catch (error) {
      console.error('Error saving website:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to save website'
      });
    } finally {
      setLoading(false);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.filtersOverlay} onClick={onClose}>
      <div 
        className={styles.modalPanel} 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '95vh' }}
      >
        <div className={styles.filtersHeader}>
          <div>
            <h3 className={styles.filtersTitle}>
              {isEditing ? 'Edit Website' : 'Add New Website'}
            </h3>
            <p className={styles.filtersSubtitle}>
              {isEditing ? 'Update website information and metrics' : 'Add a new website to the inventory'}
            </p>
          </div>
          <button onClick={onClose} className={styles.closeButton} title="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.filtersContent}>
          {/* Basic Information */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🌐 Basic Information</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  Website URL <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="example.com"
                  className={`${styles.filterInput} ${errors.website ? styles.inputError : ''}`}
                  required
                />
                {errors.website && <span className={styles.errorText}>{errors.website}</span>}
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Contact</label>
                <input
                  type="text"
                  list="contacts-list"
                  value={formData.contact}
                  onChange={(e) => handleChange('contact', e.target.value)}
                  placeholder="Contact person or email"
                  className={styles.filterInput}
                />
                <datalist id="contacts-list">
                  {contacts.map(contact => (
                    <option key={contact} value={contact} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Category</label>
                <input
                  type="text"
                  list="categories-list"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="Website category"
                  className={styles.filterInput}
                />
                <datalist id="categories-list">
                  {categories.map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>💰 Pricing</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Client Price ($)</label>
                <input
                  type="number"
                  value={formData.client_price || ''}
                  onChange={(e) => handleChange('client_price', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Price charged to client"
                  min="0"
                  step="100"
                  className={`${styles.filterInput} ${errors.client_price ? styles.inputError : ''}`}
                />
                {errors.client_price && <span className={styles.errorText}>{errors.client_price}</span>}
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Our Price ($)</label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Our cost price"
                  min="0"
                  step="100"
                  className={`${styles.filterInput} ${errors.price ? styles.inputError : ''}`}
                />
                {errors.price && <span className={styles.errorText}>{errors.price}</span>}
              </div>
            </div>
          </div>

          {/* Authority Metrics */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>📊 Authority Metrics</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Domain Rating (DR)</label>
                <input
                  type="number"
                  value={formData.domain_rating || ''}
                  onChange={(e) => handleChange('domain_rating', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0-100"
                  min="0"
                  max="100"
                  className={`${styles.filterInput} ${errors.domain_rating ? styles.inputError : ''}`}
                />
                {errors.domain_rating && <span className={styles.errorText}>{errors.domain_rating}</span>}
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Domain Authority (DA)</label>
                <input
                  type="number"
                  value={formData.da || ''}
                  onChange={(e) => handleChange('da', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0-100"
                  min="0"
                  max="100"
                  className={`${styles.filterInput} ${errors.da ? styles.inputError : ''}`}
                />
                {errors.da && <span className={styles.errorText}>{errors.da}</span>}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Backlinks</label>
              <input
                type="number"
                value={formData.backlinks || ''}
                onChange={(e) => handleChange('backlinks', e.target.value ? Number(e.target.value) : null)}
                placeholder="Number of backlinks"
                min="0"
                className={`${styles.filterInput} ${errors.backlinks ? styles.inputError : ''}`}
              />
              {errors.backlinks && <span className={styles.errorText}>{errors.backlinks}</span>}
            </div>
          </div>

          {/* Traffic Metrics */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🚀 Traffic Metrics</h4>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organic Traffic (Monthly)</label>
              <input
                type="number"
                value={formData.organic_traffic || ''}
                onChange={(e) => handleChange('organic_traffic', e.target.value ? Number(e.target.value) : null)}
                placeholder="Monthly organic traffic"
                min="0"
                className={`${styles.filterInput} ${errors.organic_traffic ? styles.inputError : ''}`}
              />
              {errors.organic_traffic && <span className={styles.errorText}>{errors.organic_traffic}</span>}
            </div>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>US Traffic</label>
                <input
                  type="number"
                  value={formData.us_traffic || ''}
                  onChange={(e) => handleChange('us_traffic', e.target.value ? Number(e.target.value) : null)}
                  placeholder="US monthly traffic"
                  min="0"
                  className={`${styles.filterInput} ${errors.us_traffic ? styles.inputError : ''}`}
                />
                {errors.us_traffic && <span className={styles.errorText}>{errors.us_traffic}</span>}
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>UK Traffic</label>
                <input
                  type="number"
                  value={formData.uk_traffic || ''}
                  onChange={(e) => handleChange('uk_traffic', e.target.value ? Number(e.target.value) : null)}
                  placeholder="UK monthly traffic"
                  min="0"
                  className={`${styles.filterInput} ${errors.uk_traffic ? styles.inputError : ''}`}
                />
                {errors.uk_traffic && <span className={styles.errorText}>{errors.uk_traffic}</span>}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Canada Traffic</label>
              <input
                type="number"
                value={formData.canada_traffic || ''}
                onChange={(e) => handleChange('canada_traffic', e.target.value ? Number(e.target.value) : null)}
                placeholder="Canada monthly traffic"
                min="0"
                className={`${styles.filterInput} ${errors.canada_traffic ? styles.inputError : ''}`}
              />
              {errors.canada_traffic && <span className={styles.errorText}>{errors.canada_traffic}</span>}
            </div>
          </div>

          {/* Content & AI Flags */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>🤖 Content & AI Flags</h4>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Index Status</label>
                <select
                  value={formData.is_indexed.toString()}
                  onChange={(e) => handleChange('is_indexed', e.target.value === 'true')}
                  className={styles.filterSelect}
                >
                  <option value="true">Indexed</option>
                  <option value="false">Not Indexed</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>TAT (Days)</label>
                <input
                  type="number"
                  value={formData.tat || ''}
                  onChange={(e) => handleChange('tat', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Turnaround time in days"
                  min="0"
                  max="365"
                  className={`${styles.filterInput} ${errors.tat ? styles.inputError : ''}`}
                />
                {errors.tat && <span className={styles.errorText}>{errors.tat}</span>}
              </div>
            </div>
            <div className={styles.checkboxGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.ai_overview}
                  onChange={(e) => handleChange('ai_overview', e.target.checked)}
                  className={styles.checkbox}
                />
                AI Overview
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.chatgpt}
                  onChange={(e) => handleChange('chatgpt', e.target.checked)}
                  className={styles.checkbox}
                />
                ChatGPT
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.perplexity}
                  onChange={(e) => handleChange('perplexity', e.target.checked)}
                  className={styles.checkbox}
                />
                Perplexity
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.gemini}
                  onChange={(e) => handleChange('gemini', e.target.checked)}
                  className={styles.checkbox}
                />
                Gemini
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.copilot}
                  onChange={(e) => handleChange('copilot', e.target.checked)}
                  className={styles.checkbox}
                />
                Copilot
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.do_follow}
                  onChange={(e) => handleChange('do_follow', e.target.checked)}
                  className={styles.checkbox}
                />
                Do Follow
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.news}
                  onChange={(e) => handleChange('news', e.target.checked)}
                  className={styles.checkbox}
                />
                News
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.sponsored}
                  onChange={(e) => handleChange('sponsored', e.target.checked)}
                  className={styles.checkbox}
                />
                Sponsored
              </label>
            </div>
          </div>

          {/* Niche Flags */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>⚠️ Niche Content</h4>
            <div className={styles.checkboxGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.cbd}
                  onChange={(e) => handleChange('cbd', e.target.checked)}
                  className={styles.checkbox}
                />
                CBD
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.casino}
                  onChange={(e) => handleChange('casino', e.target.checked)}
                  className={styles.checkbox}
                />
                Casino
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.dating}
                  onChange={(e) => handleChange('dating', e.target.checked)}
                  className={styles.checkbox}
                />
                Dating
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.crypto}
                  onChange={(e) => handleChange('crypto', e.target.checked)}
                  className={styles.checkbox}
                />
                Crypto
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>📝 Notes</h4>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional information about this website..."
                rows={3}
                className={styles.filterTextarea}
              />
            </div>
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}
        </form>

        <div className={styles.filtersActions}>
          <div className={styles.filterActionsLeft}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
          <div className={styles.filterActionsRight}>
            <button
              type="submit"
              onClick={handleSubmit}
              className={`${styles.applyButton} ${styles.hasChanges}`}
              disabled={loading}
            >
              {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Website' : 'Add Website')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWebsiteModal;
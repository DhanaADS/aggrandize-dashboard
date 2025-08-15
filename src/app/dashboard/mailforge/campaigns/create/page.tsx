'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create.module.css';

interface Contact {
  id: string;
  name: string;
  email: string;
  niche?: string;
  order_status?: string;
  confidence?: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<'details' | 'content' | 'recipients' | 'review'>('details');
  const [loading, setLoading] = useState(false);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    content: '',
    scheduled_at: '',
    status: 'draft'
  });

  // Recipients data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactFilter, setContactFilter] = useState('');
  const [contactSort, setContactSort] = useState('name');

  // Templates data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/mailforge/contacts?limit=1000');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // Filter out contacts with missing essential data
        const validContacts = result.data.filter((contact: any) => 
          contact && 
          typeof contact === 'object' &&
          contact.id && 
          contact.name && 
          contact.email &&
          typeof contact.email === 'string' &&
          contact.email.trim() !== ''
        );
        setContacts(validContacts);
      } else {
        console.warn('Invalid contacts data received:', result);
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/mailforge/templates');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setTemplates(result.data);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setCampaignData(prev => ({
        ...prev,
        subject: template.subject,
        content: template.content
      }));
    }
  };

  const handleContactToggle = (contactId: string) => {
    if (!contactId) return;
    
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAllContacts = () => {
    try {
      const filteredContacts = getFilteredContacts();
      const validContactIds = filteredContacts
        .filter(contact => contact && contact.id)
        .map(contact => contact.id);
      
      setSelectedContacts(prev => 
        prev.length === validContactIds.length
          ? []
          : validContactIds
      );
    } catch (error) {
      console.error('Error in handleSelectAllContacts:', error);
    }
  };

  const getFilteredContacts = () => {
    try {
      let filtered = Array.isArray(contacts) ? contacts : [];
      
      if (contactFilter && contactFilter.trim() !== '') {
        filtered = filtered.filter(contact => {
          if (!contact || typeof contact !== 'object') return false;
          
          const name = contact.name || '';
          const contactEmail = contact.email || '';
          const niche = contact.niche || '';
          
          const searchTerm = contactFilter.toLowerCase();
          
          return (
            name.toLowerCase().includes(searchTerm) ||
            contactEmail.toLowerCase().includes(searchTerm) ||
            niche.toLowerCase().includes(searchTerm)
          );
        });
      }

      return filtered.sort((a, b) => {
        if (!a || !b) return 0;
        
        switch (contactSort) {
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'email':
            return (a.email || '').localeCompare(b.email || '');
          case 'confidence':
            return (b.confidence || 0) - (a.confidence || 0);
          default:
            return 0;
        }
      });
    } catch (error) {
      console.error('Error in getFilteredContacts:', error);
      return [];
    }
  };

  const validateStep = (step: string) => {
    switch (step) {
      case 'details':
        return campaignData.name.trim() !== '';
      case 'content':
        return campaignData.subject.trim() !== '' && campaignData.content.trim() !== '';
      case 'recipients':
        return selectedContacts.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    
    const steps = ['details', 'content', 'recipients', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1] as any);
    }
  };

  const handlePrevious = () => {
    const steps = ['details', 'content', 'recipients', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1] as any);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/mailforge/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          recipient_contacts: selectedContacts
        })
      });

      const result = await response.json();

      if (result.success) {
        router.push('/dashboard/mailforge/campaigns');
      } else {
        alert('Failed to create campaign: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps = ['details', 'content', 'recipients', 'review'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  const safeContacts = getFilteredContacts();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          onClick={() => router.push('/dashboard/mailforge/campaigns')}
          className={styles.backButton}
        >
          ← Back to Campaigns
        </button>
        <div>
          <h1 className={styles.title}>Create Email Campaign</h1>
          <p className={styles.subtitle}>Set up your new email marketing campaign</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
        <div className={styles.stepLabels}>
          <span className={currentStep === 'details' ? styles.activeStep : ''}>Details</span>
          <span className={currentStep === 'content' ? styles.activeStep : ''}>Content</span>
          <span className={currentStep === 'recipients' ? styles.activeStep : ''}>Recipients</span>
          <span className={currentStep === 'review' ? styles.activeStep : ''}>Review</span>
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {/* Step 1: Campaign Details */}
        {currentStep === 'details' && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Campaign Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Campaign Name *</label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter campaign name"
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Campaign Type</label>
                <select
                  value={campaignData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={styles.select}
                >
                  <option value="draft">Save as Draft</option>
                  <option value="scheduled">Schedule for Later</option>
                </select>
              </div>

              {campaignData.status === 'scheduled' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={campaignData.scheduled_at}
                    onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                    className={styles.input}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Email Content */}
        {currentStep === 'content' && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Email Content</h2>
            
            {/* Template Selection */}
            <div className={styles.templateSection}>
              <h3 className={styles.sectionTitle}>Choose a Template (Optional)</h3>
              <div className={styles.templateGrid}>
                <div 
                  className={`${styles.templateCard} ${selectedTemplate === '' ? styles.selected : ''}`}
                  onClick={() => handleTemplateSelect('')}
                >
                  <div className={styles.templateIcon}>✨</div>
                  <div className={styles.templateName}>Start from Scratch</div>
                </div>
                {Array.isArray(templates) && templates.map(template => (
                  <div 
                    key={template.id}
                    className={`${styles.templateCard} ${selectedTemplate === template.id ? styles.selected : ''}`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className={styles.templateIcon}>📧</div>
                    <div className={styles.templateName}>{template.name}</div>
                    <div className={styles.templateCategory}>{template.category}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Form */}
            <div className={styles.contentForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Subject *</label>
                <input
                  type="text"
                  value={campaignData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Enter email subject line"
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Content *</label>
                <textarea
                  value={campaignData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Enter your email content..."
                  className={styles.textarea}
                  rows={12}
                />
                <div className={styles.hint}>
                  You can use variables like {`{{name}}, {{email}}, {{niche}}, {{company}}`} for personalization
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Recipients */}
        {currentStep === 'recipients' && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Select Recipients</h2>
            
            <div className={styles.recipientControls}>
              <div className={styles.controlsRow}>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                  className={styles.searchInput}
                />
                <select
                  value={contactSort}
                  onChange={(e) => setContactSort(e.target.value)}
                  className={styles.sortSelect}
                >
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="confidence">Sort by Confidence</option>
                </select>
                <button
                  onClick={handleSelectAllContacts}
                  className={styles.selectAllButton}
                >
                  {selectedContacts.length === safeContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className={styles.selectionSummary}>
                {selectedContacts.length} of {safeContacts.length} contacts selected
              </div>
            </div>

            <div className={styles.contactsList}>
              {safeContacts.map(contact => {
                if (!contact || !contact.id) return null;
                
                return (
                  <div 
                    key={contact.id}
                    className={`${styles.contactCard} ${selectedContacts.includes(contact.id) ? styles.selected : ''}`}
                    onClick={() => handleContactToggle(contact.id)}
                  >
                    <div className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleContactToggle(contact.id)}
                      />
                    </div>
                    <div className={styles.contactInfo}>
                      <div className={styles.contactName}>{contact.name || 'Unnamed Contact'}</div>
                      <div className={styles.contactEmail}>{contact.email || 'No email'}</div>
                      {contact.niche && (
                        <div className={styles.contactNiche}>{contact.niche}</div>
                      )}
                    </div>
                    <div className={styles.contactMeta}>
                      {contact.confidence && (
                        <div className={styles.confidence}>
                          Confidence: {(contact.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                      <div className={styles.status}>{contact.order_status || 'new'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Review Campaign</h2>
            
            <div className={styles.reviewGrid}>
              <div className={styles.reviewCard}>
                <h3 className={styles.reviewCardTitle}>Campaign Details</h3>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Name:</span>
                  <span className={styles.reviewValue}>{campaignData.name}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Status:</span>
                  <span className={styles.reviewValue}>{campaignData.status}</span>
                </div>
                {campaignData.scheduled_at && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Scheduled:</span>
                    <span className={styles.reviewValue}>
                      {new Date(campaignData.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.reviewCard}>
                <h3 className={styles.reviewCardTitle}>Recipients</h3>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Total Recipients:</span>
                  <span className={styles.reviewValue}>{selectedContacts.length}</span>
                </div>
              </div>

              <div className={styles.reviewCard}>
                <h3 className={styles.reviewCardTitle}>Email Preview</h3>
                <div className={styles.emailPreview}>
                  <div className={styles.emailSubject}>
                    <strong>Subject:</strong> {campaignData.subject}
                  </div>
                  <div className={styles.emailContent}>
                    {campaignData.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <div className={styles.navLeft}>
          {currentStep !== 'details' && (
            <button onClick={handlePrevious} className={styles.navButton}>
              ← Previous
            </button>
          )}
        </div>
        <div className={styles.navRight}>
          {currentStep !== 'review' ? (
            <button 
              onClick={handleNext} 
              className={styles.nextButton}
              disabled={!validateStep(currentStep)}
            >
              Next →
            </button>
          ) : (
            <button 
              onClick={handleCreateCampaign} 
              className={styles.createButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
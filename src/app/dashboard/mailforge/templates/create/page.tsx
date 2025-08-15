'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './create.module.css';

export default function CreateTemplatePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    subject: '',
    content: '',
    category: 'general',
    is_public: false
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'promotion', label: 'Promotion' }
  ];

  const variableOptions = [
    { name: '{{name}}', description: 'Contact name' },
    { name: '{{email}}', description: 'Contact email' },
    { name: '{{niche}}', description: 'Contact niche/service' },
    { name: '{{company}}', description: 'Company name' },
    { name: '{{website}}', description: 'Website URL' },
    { name: '{{price_range}}', description: 'Price range' },
    { name: '{{order_status}}', description: 'Order status' },
    { name: '{{confidence}}', description: 'Confidence score' }
  ];

  const sampleTemplates = [
    {
      name: 'Welcome New Client',
      subject: 'Welcome to {{company}}, {{name}}!',
      content: `Hi {{name}},

Welcome to {{company}}! We're thrilled to have you on board.

We specialize in {{niche}} and are excited to help you achieve your goals. Based on your requirements, we believe our services will be a perfect fit.

Next steps:
1. We'll schedule a kickoff call within 24 hours
2. Our team will prepare a customized strategy
3. We'll begin implementation based on your timeline

If you have any questions, feel free to reach out anytime.

Best regards,
The {{company}} Team`,
      category: 'welcome'
    },
    {
      name: 'Follow-up After Proposal',
      subject: 'Following up on your {{niche}} proposal',
      content: `Hi {{name}},

I wanted to follow up on the {{niche}} proposal I sent over last week.

I understand you're probably reviewing multiple options, and I'm here to answer any questions you might have about:

• Our approach and methodology
• Timeline and deliverables  
• Investment ({{price_range}})
• Next steps

Would you have 15 minutes this week for a quick call to discuss any concerns?

Looking forward to hearing from you.

Best,
[Your Name]`,
      category: 'follow-up'
    },
    {
      name: 'Cold Outreach',
      subject: 'Quick question about {{niche}} for {{company}}',
      content: `Hi {{name}},

I noticed you're working on {{niche}} at {{company}} and thought you might be interested in how we've helped similar businesses.

We recently helped a client in your industry:
• Increase their ROI by 300%
• Save 20+ hours per week
• Scale their operations efficiently

Given your focus on {{niche}}, I'd love to share how we could help {{company}} achieve similar results.

Would you be open to a 10-minute call this week?

Best regards,
[Your Name]`,
      category: 'outreach'
    }
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + variable + after;
      
      setTemplateData(prev => ({ ...prev, content: newText }));
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const loadSampleTemplate = (sample: any) => {
    setTemplateData(prev => ({
      ...prev,
      name: sample.name,
      subject: sample.subject,
      content: sample.content,
      category: sample.category
    }));
  };

  const validateForm = () => {
    return templateData.name.trim() !== '' && 
           templateData.subject.trim() !== '' && 
           templateData.content.trim() !== '';
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/mailforge/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      const result = await response.json();

      if (result.success) {
        router.push('/dashboard/mailforge/templates');
      } else {
        alert('Failed to create template: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const getPreviewContent = () => {
    return templateData.content
      .replace(/\{\{name\}\}/g, 'John Doe')
      .replace(/\{\{email\}\}/g, 'john@example.com')
      .replace(/\{\{niche\}\}/g, 'SEO Services')
      .replace(/\{\{company\}\}/g, 'Acme Corp')
      .replace(/\{\{website\}\}/g, 'acme.com')
      .replace(/\{\{price_range\}\}/g, '$5,000')
      .replace(/\{\{order_status\}\}/g, 'Qualified')
      .replace(/\{\{confidence\}\}/g, '85%');
  };

  const getPreviewSubject = () => {
    return templateData.subject
      .replace(/\{\{name\}\}/g, 'John Doe')
      .replace(/\{\{company\}\}/g, 'Acme Corp')
      .replace(/\{\{niche\}\}/g, 'SEO Services');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          onClick={() => router.push('/dashboard/mailforge/templates')}
          className={styles.backButton}
        >
          ← Back to Templates
        </button>
        <div>
          <h1 className={styles.title}>Create Email Template</h1>
          <p className={styles.subtitle}>Design reusable email templates for your campaigns</p>
        </div>
      </div>

      <div className={styles.editorLayout}>
        {/* Main Editor */}
        <div className={styles.editorMain}>
          {/* Template Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Template Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Template Name *</label>
                <input
                  type="text"
                  value={templateData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter template name"
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select
                  value={templateData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={styles.select}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Description (Optional)</label>
                <input
                  type="text"
                  value={templateData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this template"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={templateData.is_public}
                    onChange={(e) => handleInputChange('is_public', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <label htmlFor="is_public" className={styles.checkboxLabel}>
                    Make this template public (visible to all users)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Email Content</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Subject Line *</label>
              <input
                type="text"
                value={templateData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Enter email subject"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email Body *</label>
              <textarea
                id="content-textarea"
                value={templateData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter your email content..."
                className={styles.textarea}
                rows={16}
              />
              <div className={styles.hint}>
                Use variables like {{name}}, {{email}}, {{company}} for personalization
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Preview</h2>
            <div className={styles.preview}>
              <div className={styles.previewEmail}>
                <div className={styles.previewSubject}>
                  <strong>Subject:</strong> {getPreviewSubject() || 'Subject will appear here'}
                </div>
                <div className={styles.previewContent}>
                  {getPreviewContent() || 'Email content will appear here...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Variables Panel */}
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Variables</h3>
            <p className={styles.sidebarDescription}>
              Click to insert personalization variables
            </p>
            <div className={styles.variablesList}>
              {variableOptions.map((variable, index) => (
                <button
                  key={index}
                  onClick={() => insertVariable(variable.name)}
                  className={styles.variableButton}
                  title={variable.description}
                >
                  <span className={styles.variableName}>{variable.name}</span>
                  <span className={styles.variableDesc}>{variable.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Templates */}
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Sample Templates</h3>
            <p className={styles.sidebarDescription}>
              Click to load a sample template
            </p>
            <div className={styles.samplesList}>
              {sampleTemplates.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => loadSampleTemplate(sample)}
                  className={styles.sampleButton}
                >
                  <span className={styles.sampleName}>{sample.name}</span>
                  <span className={styles.sampleCategory}>{sample.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Actions */}
          <div className={styles.sidebarSection}>
            <div className={styles.saveActions}>
              <button 
                onClick={handleSave}
                className={styles.saveButton}
                disabled={!validateForm() || loading}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
              <button 
                onClick={() => router.push('/dashboard/mailforge/templates')}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
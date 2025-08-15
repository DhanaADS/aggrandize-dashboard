'use client';

import { useState } from 'react';
import { 
  ReportGenerationRequest, 
  ReportTemplate, 
  ReportType 
} from '@/types/reports';
import styles from './reports.module.css';

interface ReportGeneratorProps {
  onGenerate: (request: ReportGenerationRequest) => void;
  isGenerating: boolean;
  availableTemplates: ReportTemplate[];
}

export function ReportGenerator({ onGenerate, isGenerating, availableTemplates }: ReportGeneratorProps) {
  const [formData, setFormData] = useState<ReportGenerationRequest>({
    report_month: new Date().toISOString().slice(0, 7), // Current month
    report_type: 'executive_summary',
    include_pdf: true,
    include_excel: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const reportTypes: Array<{ value: ReportType; label: string; description: string; icon: string }> = [
    {
      value: 'executive_summary',
      label: 'Executive Summary',
      description: 'High-level monthly financial overview for executives',
      icon: '📊'
    },
    {
      value: 'detailed_report',
      label: 'Detailed Financial Report',
      description: 'Complete transaction breakdown with all financial details',
      icon: '📋'
    },
    {
      value: 'team_analysis',
      label: 'Team Analysis Report',
      description: 'Individual team member spending analysis and patterns',
      icon: '👥'
    },
    {
      value: 'category_breakdown',
      label: 'Category Breakdown',
      description: 'Deep-dive analysis by expense categories and payment methods',
      icon: '🏷️'
    }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.report_month) {
      newErrors.report_month = 'Report month is required';
    }

    if (!formData.report_type) {
      newErrors.report_type = 'Report type is required';
    }

    if (!formData.include_pdf && !formData.include_excel) {
      newErrors.format = 'At least one export format must be selected';
    }

    // Check if month is not in the future
    const selectedMonth = new Date(formData.report_month + '-01');
    const currentMonth = new Date();
    currentMonth.setDate(1); // Set to first day of current month
    
    if (selectedMonth > currentMonth) {
      newErrors.report_month = 'Cannot generate reports for future months';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onGenerate(formData);
    }
  };

  const handleInputChange = (field: keyof ReportGenerationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateQuickMonths = () => {
    const months = [];
    const current = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(current.getFullYear(), current.getMonth() - i, 1);
      months.push({
        value: monthDate.toISOString().slice(0, 7),
        label: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      });
    }
    
    return months;
  };

  return (
    <div className={styles.generatorContainer}>
      {/* Header */}
      <div className={styles.generatorHeader}>
        <h3 className={styles.generatorTitle}>🔄 Generate New Report</h3>
        <p className={styles.generatorSubtitle}>
          Create comprehensive financial reports with detailed analytics and insights
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.generatorForm}>
        {/* Month Selection */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>📅 Report Period</h4>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Select Month</label>
            <select
              value={formData.report_month}
              onChange={(e) => handleInputChange('report_month', e.target.value)}
              className={`${styles.formSelect} ${errors.report_month ? styles.formError : ''}`}
            >
              <option value="">Choose a month...</option>
              {generateQuickMonths().map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {errors.report_month && (
              <span className={styles.errorMessage}>{errors.report_month}</span>
            )}
          </div>

          {/* Quick month buttons */}
          <div className={styles.quickMonths}>
            <span className={styles.quickLabel}>Quick Select:</span>
            {generateQuickMonths().slice(0, 4).map(month => (
              <button
                key={month.value}
                type="button"
                onClick={() => handleInputChange('report_month', month.value)}
                className={`${styles.quickButton} ${
                  formData.report_month === month.value ? styles.quickButtonActive : ''
                }`}
              >
                {month.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Report Type Selection */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>📊 Report Type</h4>
          
          <div className={styles.reportTypeGrid}>
            {reportTypes.map(type => (
              <div
                key={type.value}
                onClick={() => handleInputChange('report_type', type.value)}
                className={`${styles.reportTypeCard} ${
                  formData.report_type === type.value ? styles.reportTypeCardActive : ''
                }`}
              >
                <div className={styles.typeIcon}>{type.icon}</div>
                <div className={styles.typeContent}>
                  <h5 className={styles.typeName}>{type.label}</h5>
                  <p className={styles.typeDescription}>{type.description}</p>
                </div>
              </div>
            ))}
          </div>
          {errors.report_type && (
            <span className={styles.errorMessage}>{errors.report_type}</span>
          )}
        </div>

        {/* Template Selection (if available) */}
        {availableTemplates.length > 0 && (
          <div className={styles.formSection}>
            <h4 className={styles.sectionTitle}>🎨 Template</h4>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Choose Template (Optional)</label>
              <select
                value={formData.template_id || ''}
                onChange={(e) => handleInputChange('template_id', e.target.value || undefined)}
                className={styles.formSelect}
              >
                <option value="">Use Default Template</option>
                {availableTemplates
                  .filter(template => template.template_type === formData.report_type)
                  .map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>📁 Export Options</h4>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.include_pdf}
                onChange={(e) => handleInputChange('include_pdf', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Generate PDF Report</span>
              <span className={styles.checkboxDescription}>Professional PDF with charts and styling</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.include_excel}
                onChange={(e) => handleInputChange('include_excel', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Generate Excel Export</span>
              <span className={styles.checkboxDescription}>Spreadsheet with raw data and formulas</span>
            </label>
          </div>
          
          {errors.format && (
            <span className={styles.errorMessage}>{errors.format}</span>
          )}
        </div>

        {/* Advanced Options */}
        <div className={styles.formSection}>
          <details className={styles.advancedSection}>
            <summary className={styles.advancedToggle}>⚙️ Advanced Options</summary>
            
            <div className={styles.advancedContent}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Custom Filters (Optional)</label>
                <textarea
                  placeholder="Enter custom filters as JSON (e.g., specific categories, team members)"
                  onChange={(e) => {
                    try {
                      const filters = e.target.value ? JSON.parse(e.target.value) : undefined;
                      handleInputChange('custom_filters', filters);
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className={styles.formTextarea}
                  rows={3}
                />
              </div>
            </div>
          </details>
        </div>

        {/* Generation Info */}
        <div className={styles.generationInfo}>
          <div className={styles.infoCard}>
            <h5 className={styles.infoTitle}>📈 What will be included?</h5>
            <ul className={styles.infoList}>
              <li>✅ Complete financial summary for {formData.report_month || 'selected month'}</li>
              <li>✅ Expense breakdown by categories, team members, and payment methods</li>
              <li>✅ Salary and subscription analysis</li>
              <li>✅ Settlement status and outstanding payments</li>
              <li>✅ Charts, graphs, and visual analytics</li>
              <li>✅ AI-powered insights and recommendations</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h5 className={styles.infoTitle}>⏱️ Generation Time</h5>
            <p className={styles.infoText}>
              Report generation typically takes 30-60 seconds depending on data volume and complexity.
              You'll be notified when the report is ready.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className={styles.formActions}>
          <button
            type="submit"
            disabled={isGenerating}
            className={`${styles.generateButton} ${isGenerating ? styles.generating : ''}`}
          >
            {isGenerating ? (
              <>
                <span className={styles.spinner}></span>
                Generating Report...
              </>
            ) : (
              <>
                🚀 Generate Report
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
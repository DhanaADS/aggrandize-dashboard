'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './import.module.css';

interface CSVField {
  index: number;
  name: string;
  sample: string;
  mapped: string;
}

interface ImportStats {
  totalRows: number;
  validEmails: number;
  duplicates: number;
  errors: number;
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [fields, setFields] = useState<CSVField[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importStats, setImportStats] = useState<ImportStats>({ totalRows: 0, validEmails: 0, duplicates: 0, errors: 0 });
  const [isImporting, setIsImporting] = useState(false);

  // Available field mappings based on the Google Sheets structure
  const availableFields = [
    { value: 'name', label: 'Name', required: true },
    { value: 'email', label: 'Email', required: true },
    { value: 'niche', label: 'Niche/Inquiry' },
    { value: 'website', label: 'Website' },
    { value: 'clientType', label: 'Client Type' },
    { value: 'dateInteraction', label: 'Date Interaction' },
    { value: 'priceRange', label: 'Price Range' },
    { value: 'orderStatus', label: 'Order Status' },
    { value: 'confidence', label: 'Confidence' },
    { value: 'notes', label: 'Additional Notes' },
    { value: 'skip', label: '--- Skip Column ---' }
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      alert('Please upload a CSV file');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => 
        row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(row => row.some(cell => cell.length > 0));

      setCsvData(rows);

      if (rows.length > 0) {
        const headers = rows[0];
        const sampleData = rows[1] || [];
        const detectedFields: CSVField[] = headers.map((header, index) => ({
          index,
          name: header,
          sample: sampleData[index] || '',
          mapped: detectFieldMapping(header)
        }));
        setFields(detectedFields);
        setCurrentStep('mapping');
      }
    };
    reader.readAsText(file);
  };

  const detectFieldMapping = (headerName: string): string => {
    const lower = headerName.toLowerCase();
    if (lower.includes('name')) return 'name';
    if (lower.includes('email')) return 'email';
    if (lower.includes('niche') || lower.includes('inquiry')) return 'niche';
    if (lower.includes('website')) return 'website';
    if (lower.includes('client')) return 'clientType';
    if (lower.includes('date') || lower.includes('interaction')) return 'dateInteraction';
    if (lower.includes('price') || lower.includes('budget')) return 'priceRange';
    if (lower.includes('status') || lower.includes('order')) return 'orderStatus';
    if (lower.includes('confidence')) return 'confidence';
    if (lower.includes('note')) return 'notes';
    return 'skip';
  };

  const updateFieldMapping = (fieldIndex: number, mapping: string) => {
    setFields(prev => prev.map((field, index) => 
      index === fieldIndex ? { ...field, mapped: mapping } : field
    ));
  };

  const validateMapping = () => {
    const hasName = fields.some(field => field.mapped === 'name');
    const hasEmail = fields.some(field => field.mapped === 'email');
    return hasName && hasEmail;
  };

  const previewData = () => {
    if (!validateMapping()) {
      alert('Please map at least Name and Email columns');
      return;
    }

    // Calculate import stats
    const dataRows = csvData.slice(1); // Skip header
    const emailIndex = fields.find(f => f.mapped === 'email')?.index || -1;
    const validEmails = dataRows.filter(row => {
      const email = row[emailIndex];
      return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }).length;

    setImportStats({
      totalRows: dataRows.length,
      validEmails,
      duplicates: 0, // TODO: Implement duplicate detection
      errors: dataRows.length - validEmails
    });
    
    setCurrentStep('preview');
  };

  const startImport = async () => {
    setIsImporting(true);
    setCurrentStep('importing');

    try {
      // Prepare contacts data for import
      const dataRows = csvData.slice(1); // Skip header
      const contactsToImport = dataRows
        .map(row => {
          const contact: any = {};
          fields.forEach(field => {
            if (field.mapped !== 'skip' && row[field.index]) {
              const value = row[field.index].trim();
              switch (field.mapped) {
                case 'name':
                  contact.name = value;
                  break;
                case 'email':
                  contact.email = value;
                  break;
                case 'niche':
                  contact.niche = value;
                  break;
                case 'website':
                  contact.website = value;
                  break;
                case 'clientType':
                  contact.clientType = value;
                  break;
                case 'dateInteraction':
                  contact.dateInteraction = value;
                  break;
                case 'priceRange':
                  contact.priceRange = value;
                  break;
                case 'orderStatus':
                  contact.orderStatus = value;
                  break;
                case 'confidence':
                  const confidence = parseFloat(value) || 0.0;
                  // Ensure confidence is between 0.0 and 1.0
                  contact.confidence = Math.max(0.0, Math.min(1.0, confidence));
                  break;
                case 'notes':
                  contact.notes = value;
                  break;
              }
            }
          });
          return contact;
        })
        .filter(contact => contact.name && contact.email); // Only include contacts with name and email

      // Send to API for bulk import
      const response = await fetch('/api/mailforge/contacts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'bulk_import',
          contacts: contactsToImport
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Import failed:', response.status, result);
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in first.');
        }
        const errorMessage = result.details ? 
          `${result.error}: ${result.details}` : 
          result.error || `Import failed (${response.status})`;
        throw new Error(errorMessage);
      }

      setIsImporting(false);
      alert(`Successfully imported ${result.imported} out of ${result.total} contacts!`);
      router.push('/dashboard/mailforge/contacts');
    } catch (error) {
      setIsImporting(false);
      console.error('Import error:', error);
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setCurrentStep('preview');
    }
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setFields([]);
    setCurrentStep('upload');
    setImportStats({ totalRows: 0, validEmails: 0, duplicates: 0, errors: 0 });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button 
          onClick={() => router.push('/dashboard/mailforge')}
          className={styles.backButton}
        >
          ← Back to MailForge
        </button>
        <div>
          <h1 className={styles.title}>Import Contacts</h1>
          <p className={styles.subtitle}>Upload your CSV file to import leads and contacts</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className={styles.progressSteps}>
        <div className={`${styles.step} ${currentStep === 'upload' ? styles.active : ''} ${csvData.length > 0 ? styles.completed : ''}`}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepLabel}>Upload CSV</div>
        </div>
        <div className={`${styles.step} ${currentStep === 'mapping' ? styles.active : ''} ${currentStep === 'preview' || currentStep === 'importing' ? styles.completed : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepLabel}>Map Fields</div>
        </div>
        <div className={`${styles.step} ${currentStep === 'preview' ? styles.active : ''} ${currentStep === 'importing' ? styles.completed : ''}`}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepLabel}>Preview</div>
        </div>
        <div className={`${styles.step} ${currentStep === 'importing' ? styles.active : ''}`}>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepLabel}>Import</div>
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.content}>
        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className={styles.uploadSection}>
            <div 
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.uploadIcon}>📁</div>
              <h3 className={styles.uploadTitle}>
                {dragActive ? 'Drop your CSV file here' : 'Upload CSV File'}
              </h3>
              <p className={styles.uploadDescription}>
                Drag and drop your CSV file or click to browse
              </p>
              <div className={styles.uploadHint}>
                Supported format: .csv files up to 10MB
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              style={{ display: 'none' }}
            />

            {/* Sample Format Guide */}
            <div className={styles.sampleFormat}>
              <h4 className={styles.sampleTitle}>Expected CSV Format</h4>
              <div className={styles.sampleTable}>
                <div className={styles.sampleHeader}>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Niche/Inquiry</span>
                  <span>Client Type</span>
                  <span>Price Range</span>
                </div>
                <div className={styles.sampleRow}>
                  <span>John Doe</span>
                  <span>john@example.com</span>
                  <span>SEO Services</span>
                  <span>Direct Client</span>
                  <span>$3,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {currentStep === 'mapping' && (
          <div className={styles.mappingSection}>
            <div className={styles.mappingHeader}>
              <h3 className={styles.mappingTitle}>Map CSV Fields</h3>
              <p className={styles.mappingDescription}>
                Match your CSV columns to MailForge fields. Name and Email are required.
              </p>
            </div>

            <div className={styles.mappingTable}>
              <div className={styles.mappingTableHeader}>
                <span>CSV Column</span>
                <span>Sample Data</span>
                <span>Maps To</span>
              </div>
              {fields.map((field, index) => (
                <div key={index} className={styles.mappingRow}>
                  <div className={styles.columnName}>{field.name}</div>
                  <div className={styles.sampleData}>{field.sample}</div>
                  <div className={styles.mappingSelect}>
                    <select
                      value={field.mapped}
                      onChange={(e) => updateFieldMapping(index, e.target.value)}
                      className={styles.selectField}
                    >
                      {availableFields.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} {option.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.mappingActions}>
              <button onClick={resetImport} className={styles.secondaryButton}>
                Start Over
              </button>
              <button 
                onClick={previewData} 
                className={styles.primaryButton}
                disabled={!validateMapping()}
              >
                Preview Import
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 'preview' && (
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>Import Preview</h3>
              <p className={styles.previewDescription}>
                Review your import statistics before proceeding
              </p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{importStats.totalRows}</div>
                <div className={styles.statLabel}>Total Rows</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{importStats.validEmails}</div>
                <div className={styles.statLabel}>Valid Emails</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{importStats.duplicates}</div>
                <div className={styles.statLabel}>Duplicates</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{importStats.errors}</div>
                <div className={styles.statLabel}>Errors</div>
              </div>
            </div>

            {/* Preview Table */}
            <div className={styles.previewTable}>
              <h4 className={styles.previewTableTitle}>Data Preview (First 5 rows)</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {fields.filter(f => f.mapped !== 'skip').map((field, index) => (
                        <th key={index}>{availableFields.find(f => f.value === field.mapped)?.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 6).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {fields.filter(f => f.mapped !== 'skip').map((field, colIndex) => (
                          <td key={colIndex}>{row[field.index] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.previewActions}>
              <button onClick={() => setCurrentStep('mapping')} className={styles.secondaryButton}>
                Back to Mapping
              </button>
              <button 
                onClick={startImport} 
                className={styles.primaryButton}
                disabled={importStats.validEmails === 0}
              >
                Import {importStats.validEmails} Contacts
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {currentStep === 'importing' && (
          <div className={styles.importingSection}>
            <div className={styles.importingContent}>
              <div className={styles.importingIcon}>
                <div className={styles.spinner}></div>
              </div>
              <h3 className={styles.importingTitle}>Importing Contacts</h3>
              <p className={styles.importingDescription}>
                Please wait while we import your {importStats.validEmails} contacts...
              </p>
              <div className={styles.importingProgress}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
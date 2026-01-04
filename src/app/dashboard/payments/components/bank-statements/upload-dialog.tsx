'use client';

import { useState, useRef } from 'react';
import styles from '../../payments.module.css';

interface UploadDialogProps {
  onClose: () => void;
  onUploadComplete: (statementId: string) => void;
}

type UploadStep = 'upload' | 'processing' | 'preview' | 'matching' | 'complete';

export default function UploadDialog({ onClose, onUploadComplete }: UploadDialogProps) {
  const [step, setStep] = useState<UploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');

  const [extractedData, setExtractedData] = useState<any>(null);
  const [statementId, setStatementId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !isProcessing) {
      onClose();
    }
  };

  // File selection handlers
  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'pdf'].includes(ext || '')) {
      setError('Invalid file type. Please upload Excel (.xlsx, .xls), CSV, or PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Process uploaded file
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStep('processing');
    setProgress(10);
    setError(null);

    try {
      // Step 1: Create bank statement record
      setProgress(20);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bank_name', bankName);

      const uploadRes = await fetch('/api/bank-statements/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadRes.json();
      setStatementId(uploadData.statement_id);
      setProgress(40);

      // Step 2: Extract transactions with AI
      const extractRes = await fetch('/api/bank-statements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement_id: uploadData.statement_id,
          file: selectedFile.name,
        }),
      });

      setProgress(70);

      if (!extractRes.ok) {
        throw new Error('Failed to analyze statement');
      }

      const extractData = await extractRes.json();
      setExtractedData(extractData);
      setProgress(90);

      // Step 3: Run matching
      const matchRes = await fetch('/api/bank-statements/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement_id: uploadData.statement_id,
        }),
      });

      setProgress(100);

      if (!matchRes.ok) {
        throw new Error('Failed to match transactions');
      }

      const matchData = await matchRes.json();

      // Move to matching review step
      setStep('matching');
      setIsProcessing(false);

      // If no matches, skip to complete
      if (matchData.matches.length === 0 && matchData.suggestions.length === 0) {
        setStep('complete');
        setTimeout(() => {
          onUploadComplete(uploadData.statement_id);
        }, 2000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsProcessing(false);
      setStep('upload');
    }
  };

  // Render based on step
  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className={styles.dialogContent}>
            <h2 className={styles.dialogTitle}>Upload Bank Statement</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Bank Name (Optional)</label>
              <input
                type="text"
                className={styles.input}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., HDFC Bank, ICICI Bank"
              />
            </div>

            <div
              className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              {selectedFile ? (
                <div className={styles.selectedFile}>
                  <div className={styles.fileIcon}>📄</div>
                  <div className={styles.fileName}>{selectedFile.name}</div>
                  <div className={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div className={styles.uploadPrompt}>
                  <div className={styles.uploadIcon}>📤</div>
                  <p>Drag and drop your bank statement here</p>
                  <p className={styles.uploadHint}>or click to browse</p>
                  <p className={styles.uploadFormats}>Supports: Excel (.xlsx, .xls), CSV, PDF</p>
                </div>
              )}
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.dialogActions}>
              <button
                className={styles.buttonSecondary}
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className={styles.button}
                onClick={handleUpload}
                disabled={!selectedFile || isProcessing}
              >
                Upload & Analyze
              </button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className={styles.dialogContent}>
            <h2 className={styles.dialogTitle}>Processing Statement...</h2>

            <div className={styles.processingContainer}>
              <div className={styles.processingSpinner}>
                <div className={styles.spinner}></div>
              </div>

              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className={styles.processingText}>
                {progress < 30 && 'Uploading file...'}
                {progress >= 30 && progress < 70 && 'Extracting transactions with AI...'}
                {progress >= 70 && progress < 100 && 'Matching with subscriptions...'}
                {progress === 100 && 'Complete!'}
              </div>
            </div>
          </div>
        );

      case 'matching':
        return (
          <div className={styles.dialogContent}>
            <h2 className={styles.dialogTitle}>Matching Complete</h2>

            <div className={styles.matchingSummary}>
              <p>
                Found <strong>{extractedData?.total_transactions || 0}</strong> transactions
              </p>
              <p>
                Matched <strong>{extractedData?.matched_count || 0}</strong> with subscriptions
              </p>
            </div>

            <div className={styles.dialogActions}>
              <button
                className={styles.button}
                onClick={() => {
                  setStep('complete');
                  setTimeout(() => {
                    if (statementId) {
                      onUploadComplete(statementId);
                    }
                  }, 1500);
                }}
              >
                View Results
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className={styles.dialogContent}>
            <div className={styles.successIcon}>✅</div>
            <h2 className={styles.dialogTitle}>Upload Complete!</h2>
            <p className={styles.successMessage}>
              Your bank statement has been processed successfully.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={overlayRef}
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modal}>
        {renderContent()}
      </div>
    </div>
  );
}

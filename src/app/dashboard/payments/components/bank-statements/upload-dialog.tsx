'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

interface UploadDialogProps {
  onClose: () => void;
  onUploadComplete: (statementId: string) => void;
}

type UploadStep = 'upload' | 'processing' | 'matching' | 'complete';

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
          <>
            <DialogContent>
              <TextField
                fullWidth
                label="Bank Name (Optional)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., HDFC Bank, ICICI Bank"
                sx={{ mb: 3 }}
              />

              <Paper
                variant="outlined"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: isDragging ? 2 : 1,
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  borderStyle: 'dashed',
                  bgcolor: isDragging ? 'action.hover' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />

                {selectedFile ? (
                  <Box>
                    <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      Drag and drop your bank statement here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                      Supports: Excel (.xlsx, .xls), CSV, PDF (Max 10MB)
                    </Typography>
                  </Box>
                )}
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || isProcessing}
                startIcon={<UploadIcon />}
              >
                Upload & Analyze
              </Button>
            </DialogActions>
          </>
        );

      case 'processing':
        return (
          <>
            <DialogContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Processing Statement...
                </Typography>

                <Box sx={{ my: 4 }}>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {progress < 30 && 'Uploading file...'}
                    {progress >= 30 && progress < 70 && 'Extracting transactions with AI...'}
                    {progress >= 70 && progress < 100 && 'Matching with subscriptions...'}
                    {progress === 100 && 'Complete!'}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
          </>
        );

      case 'matching':
        return (
          <>
            <DialogContent>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Matching Complete
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                  <Chip
                    label={`${extractedData?.total_transactions || 0} transactions found`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${extractedData?.matched_count || 0} matched`}
                    color="success"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button
                variant="contained"
                onClick={() => {
                  setStep('complete');
                  setTimeout(() => {
                    if (statementId) {
                      onUploadComplete(statementId);
                    }
                  }, 1500);
                }}
                fullWidth
              >
                View Results
              </Button>
            </DialogActions>
          </>
        );

      case 'complete':
        return (
          <>
            <DialogContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload Complete!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your bank statement has been processed successfully.
                </Typography>
              </Box>
            </DialogContent>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Upload Bank Statement</DialogTitle>
      {renderContent()}
    </Dialog>
  );
}

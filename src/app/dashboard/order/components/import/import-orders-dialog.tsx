'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  FilePresent,
} from '@mui/icons-material';

interface ImportResult {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalOrders: number;
    totalItems: number;
    totalImported: number;
    totalSkipped: number;
    totalErrors: number;
  };
  details: {
    month: string;
    orders: number;
    items: number;
    imported: number;
    skipped: number;
    errors: number;
  }[];
}

interface ImportOrdersDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function ImportOrdersDialog({ open, onClose, onImportComplete }: ImportOrdersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx') && !droppedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setStep('preview');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', 'true');

      const response = await fetch('/api/import/orders', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview import');
      }

      setResult(data);
    } catch (err) {
      setError((err as Error).message);
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setStep('importing');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', 'false');

      const response = await fetch('/api/import/orders', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import orders');
      }

      setResult(data);
      setStep('complete');
      onImportComplete?.();
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStep('upload');
    onClose();
  };

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload color="primary" />
          Import Historical Orders
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Upload Step */}
        {step === 'upload' && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Upload an Excel file with historical orders. Expected format:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Sheets named by month (Jan, Feb, Mar, etc.)</li>
                <li>Columns: No, Date, Client, Client URL, Keywords, Publication, Price, Status, Link</li>
                <li>Order numbers like TA20_01 will be converted to AGG-2020-001</li>
              </Box>
            </Alert>

            <Box
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: file ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: file ? 'action.selected' : 'background.default',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {file ? (
                <Box>
                  <FilePresent sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Click or drop another file to replace
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Drop Excel file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to browse
                  </Typography>
                </Box>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}

        {/* Preview/Importing/Complete Steps */}
        {(step === 'preview' || step === 'importing' || step === 'complete') && (
          <Box>
            {loading && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {step === 'preview' ? 'Analyzing file...' : 'Importing orders...'}
                </Typography>
                <LinearProgress />
              </Box>
            )}

            {result && (
              <Box>
                {/* Summary */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<Info />}
                    label={`${formatNumber(result.summary.totalOrders)} Orders`}
                    color="default"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Info />}
                    label={`${formatNumber(result.summary.totalItems)} Items`}
                    color="default"
                    variant="outlined"
                  />
                  {result.dryRun ? (
                    <Chip
                      icon={<CheckCircle />}
                      label={`${formatNumber(result.summary.totalImported)} Will Import`}
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      icon={<CheckCircle />}
                      label={`${formatNumber(result.summary.totalImported)} Imported`}
                      color="success"
                    />
                  )}
                  <Chip
                    label={`${formatNumber(result.summary.totalSkipped)} Skipped`}
                    color="warning"
                    variant="outlined"
                  />
                  {result.summary.totalErrors > 0 && (
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${formatNumber(result.summary.totalErrors)} Errors`}
                      color="error"
                    />
                  )}
                </Box>

                {/* Details Table */}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Orders</TableCell>
                        <TableCell align="right">Items</TableCell>
                        <TableCell align="right">{result.dryRun ? 'Will Import' : 'Imported'}</TableCell>
                        <TableCell align="right">Skipped</TableCell>
                        <TableCell align="right">Errors</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.details.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell align="right">{row.orders}</TableCell>
                          <TableCell align="right">{row.items}</TableCell>
                          <TableCell align="right">
                            <Typography
                              color={row.imported > 0 ? 'success.main' : 'text.secondary'}
                            >
                              {row.imported}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color="text.secondary">
                              {row.skipped}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color={row.errors > 0 ? 'error.main' : 'text.secondary'}>
                              {row.errors}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {step === 'complete' && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    Import completed! {formatNumber(result.summary.totalImported)} orders with{' '}
                    {formatNumber(result.summary.totalItems)} items have been imported.
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === 'upload' && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handlePreview}
              disabled={!file || loading}
              startIcon={<Info />}
            >
              Preview Import
            </Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <Button onClick={() => setStep('upload')} disabled={loading}>
              Back
            </Button>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleImport}
              disabled={loading || !result || result.summary.totalImported === 0}
              startIcon={<CloudUpload />}
            >
              Import {result?.summary.totalImported || 0} Orders
            </Button>
          </>
        )}

        {step === 'importing' && (
          <Button disabled>Importing...</Button>
        )}

        {step === 'complete' && (
          <Button variant="contained" onClick={handleClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

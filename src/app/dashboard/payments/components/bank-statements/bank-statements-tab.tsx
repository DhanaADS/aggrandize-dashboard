'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as CompletedIcon,
  Error as FailedIcon,
  HourglassEmpty as PendingIcon,
  Refresh as ProcessingIcon,
} from '@mui/icons-material';
import { BankStatement, BankTransaction } from '@/types/bank-statements';
import { Subscription } from '@/types/finance';
import {
  getBankStatements,
  getBankTransactions,
  updateTransactionMatch,
} from '@/lib/bank-statements-api';
import { getSubscriptions } from '@/lib/finance-api';
import UploadDialog from './upload-dialog';
import TransactionTable from './transaction-table';

export default function BankStatementsTab() {
  const { data: session } = useSession();
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch data
  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBankStatements();
      setStatements(data || []);

      // Auto-select first statement if none selected
      if (!selectedStatement && data && data.length > 0) {
        setSelectedStatement(data[0]);
      }
    } catch (err) {
      console.error('Error fetching statements:', err);
      setError('Failed to load bank statements');
    } finally {
      setLoading(false);
    }
  }, [selectedStatement]);

  const fetchTransactions = useCallback(async (statementId: string) => {
    try {
      const data = await getBankTransactions({ statement_id: statementId });
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
    fetchSubscriptions();
  }, [refreshTrigger, fetchStatements, fetchSubscriptions]);

  useEffect(() => {
    if (selectedStatement) {
      fetchTransactions(selectedStatement.id);
    }
  }, [selectedStatement, fetchTransactions]);

  // Handlers
  const handleUploadComplete = (statementId: string) => {
    setShowUploadDialog(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMatchConfirm = async (transactionId: string, subscriptionId: string) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) return;

      const matchReason = `Manually matched with ${subscription.platform}`;

      await updateTransactionMatch(transactionId, subscriptionId, 1.0, matchReason);

      // Refresh transactions
      if (selectedStatement) {
        fetchTransactions(selectedStatement.id);
      }
    } catch (err) {
      console.error('Error confirming match:', err);
      setError('Failed to confirm match');
    }
  };

  const handleIgnore = async (transactionId: string) => {
    try {
      // Update transaction to ignored status
      console.log('Ignoring transaction:', transactionId);
      if (selectedStatement) {
        fetchTransactions(selectedStatement.id);
      }
    } catch (err) {
      console.error('Error ignoring transaction:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: '#10b981', fontSize: 18 }} />;
      case 'processing':
        return <ProcessingIcon sx={{ color: '#f59e0b', fontSize: 18 }} />;
      case 'failed':
        return <FailedIcon sx={{ color: '#ef4444', fontSize: 18 }} />;
      default:
        return <PendingIcon sx={{ color: '#6b7280', fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Bank Statements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload bank statements and automatically match transactions with subscriptions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setShowUploadDialog(true)}
          sx={{ textTransform: 'none' }}
        >
          Upload Statement
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Statements Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Statements ({statements.length})
            </Typography>

            {statements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <FileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No statements uploaded yet
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowUploadDialog(true)}
                  sx={{ mt: 2, textTransform: 'none' }}
                >
                  Upload First Statement
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                {statements.map((stmt) => (
                  <Card
                    key={stmt.id}
                    variant={selectedStatement?.id === stmt.id ? 'elevation' : 'outlined'}
                    sx={{
                      cursor: 'pointer',
                      border: selectedStatement?.id === stmt.id ? 2 : 1,
                      borderColor: selectedStatement?.id === stmt.id ? 'primary.main' : 'divider',
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedStatement(stmt)}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {stmt.bank_name || 'Unknown Bank'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getStatusIcon(stmt.processing_status)}
                          </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {stmt.file_name}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${stmt.total_transactions} transactions`}
                            size="small"
                            variant="outlined"
                          />
                          {stmt.matched_transactions > 0 && (
                            <Chip
                              label={`${stmt.matched_transactions} matched`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                          {new Date(stmt.upload_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Main Content - Transactions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {selectedStatement ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {selectedStatement.bank_name || 'Bank Statement'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      File: {selectedStatement.file_name}
                    </Typography>
                    {selectedStatement.statement_period_start && (
                      <Typography variant="body2" color="text.secondary">
                        Period: {new Date(selectedStatement.statement_period_start).toLocaleDateString()} -{' '}
                        {selectedStatement.statement_period_end
                          ? new Date(selectedStatement.statement_period_end).toLocaleDateString()
                          : 'Present'}
                      </Typography>
                    )}
                    {selectedStatement.account_number && (
                      <Typography variant="body2" color="text.secondary">
                        Account: ****{selectedStatement.account_number}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <TransactionTable
                  transactions={transactions}
                  subscriptions={subscriptions}
                  onMatchConfirm={handleMatchConfirm}
                  onIgnore={handleIgnore}
                />
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="body1" color="text.secondary">
                  Select a statement to view transactions
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <UploadDialog
          onClose={() => setShowUploadDialog(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </Box>
  );
}

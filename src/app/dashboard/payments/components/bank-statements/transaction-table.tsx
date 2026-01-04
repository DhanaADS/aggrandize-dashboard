'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  Block as IgnoreIcon,
} from '@mui/icons-material';
import { BankTransaction } from '@/types/bank-statements';
import { Subscription } from '@/types/finance';

interface TransactionTableProps {
  transactions: BankTransaction[];
  subscriptions: Subscription[];
  onMatchConfirm: (transactionId: string, subscriptionId: string) => void;
  onIgnore: (transactionId: string) => void;
}

export default function TransactionTable({
  transactions,
  subscriptions,
  onMatchConfirm,
  onIgnore,
}: TransactionTableProps) {
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [matchingSub, setMatchingSub] = useState<string>('');

  const handleManualMatch = (txId: string) => {
    if (matchingSub) {
      onMatchConfirm(txId, matchingSub);
      setSelectedTx(null);
      setMatchingSub('');
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'matched':
        return <Chip label="Matched" color="success" size="small" />;
      case 'unmatched':
        return <Chip label="Unmatched" color="warning" size="small" />;
      case 'manual':
        return <Chip label="Manual" color="info" size="small" />;
      case 'ignored':
        return <Chip label="Ignored" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getConfidenceChip = (confidence?: number) => {
    if (!confidence) return null;

    const percent = (confidence * 100).toFixed(0);
    let color: 'success' | 'warning' | 'error' = 'error';

    if (confidence >= 0.8) {
      color = 'success';
    } else if (confidence >= 0.6) {
      color = 'warning';
    }

    return <Chip label={`${percent}%`} color={color} size="small" variant="outlined" />;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter transactions by type
  const debits = transactions.filter(t => t.transaction_type === 'debit');
  const credits = transactions.filter(t => t.transaction_type === 'credit');

  // Stats
  const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
  const matchedCount = transactions.filter(t => t.match_status === 'matched').length;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Transactions
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {transactions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Debits
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#ef4444' }}>
                {formatAmount(totalDebits)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Credits
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#10b981' }}>
                {formatAmount(totalCredits)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Matched
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {matchedCount} / {debits.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Match</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Typography variant="body2">{formatDate(tx.transaction_date)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{tx.description}</Typography>
                      {tx.normalized_description && tx.normalized_description !== tx.description && (
                        <Typography variant="caption" color="text.secondary">
                          {tx.normalized_description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: tx.transaction_type === 'debit' ? '#ef4444' : '#10b981' }}
                    >
                      {formatAmount(tx.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tx.transaction_type}
                      size="small"
                      color={tx.transaction_type === 'debit' ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{getStatusChip(tx.match_status)}</TableCell>
                  <TableCell>
                    {tx.matched_subscription_id ? (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinkIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="body2">
                            {tx.matched_subscription?.platform || 'Subscription'}
                          </Typography>
                        </Box>
                        {tx.match_reason && (
                          <Typography variant="caption" color="text.secondary">
                            {tx.match_reason}
                          </Typography>
                        )}
                      </Box>
                    ) : selectedTx === tx.id ? (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={matchingSub}
                          onChange={(e) => setMatchingSub(e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select subscription...</em>
                          </MenuItem>
                          {subscriptions
                            .filter(s => s.is_active && s.auto_renewal)
                            .map(sub => (
                              <MenuItem key={sub.id} value={sub.id}>
                                {sub.platform} - {formatAmount(sub.amount_inr)}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{getConfidenceChip(tx.match_confidence)}</TableCell>
                  <TableCell align="right">
                    {tx.match_status === 'unmatched' && (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {selectedTx === tx.id ? (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleManualMatch(tx.id)}
                              disabled={!matchingSub}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTx(null);
                                setMatchingSub('');
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setSelectedTx(tx.id)}
                              sx={{ textTransform: 'none' }}
                            >
                              Match
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => onIgnore(tx.id)}
                              title="Ignore"
                            >
                              <IgnoreIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    )}
                    {tx.match_status === 'matched' && (
                      <Chip
                        icon={<CheckIcon />}
                        label="Matched"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

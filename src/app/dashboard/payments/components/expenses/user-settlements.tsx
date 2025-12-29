'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Skeleton,
  Alert,
  Collapse,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SettleIcon,
} from '@mui/icons-material';
import { UserSettlementSummary, ADS_ACCOUNTS } from '@/types/finance';
import { getUserSettlementSummaries, bulkMarkSettled } from '@/lib/finance-api';

interface UserSettlementsProps {
  refreshTrigger?: number;
}

export function UserSettlements({ refreshTrigger }: UserSettlementsProps) {
  const [summaries, setSummaries] = useState<UserSettlementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [settlingUser, setSettlingUser] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserSettlementSummaries();
      setSummaries(data || []);
    } catch (err) {
      setError('Failed to load settlement summaries');
      console.error('Error fetching settlement summaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries, refreshTrigger]);

  const handleToggleExpand = (user: string) => {
    setExpandedUser(expandedUser === user ? null : user);
  };

  const handleMarkSettled = async (user: string) => {
    if (!confirm(`Mark all pending expenses for ${user} as settled?`)) return;

    setSettlingUser(user);
    try {
      await bulkMarkSettled(user);
      // Refresh the data
      await fetchSummaries();
      setExpandedUser(null);
    } catch (err) {
      alert('Failed to mark settlements as completed');
      console.error('Error settling:', err);
    } finally {
      setSettlingUser(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totalOwed = summaries.reduce((sum, s) => sum + s.total_owed, 0);
  const totalPending = summaries.reduce((sum, s) => sum + s.pending_count, 0);

  // Get current month name
  const currentMonth = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Team Settlement Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentMonth} • {summaries.length} team member{summaries.length !== 1 ? 's' : ''} with pending settlements
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">Total Owed to Company</Typography>
          <Typography variant="h5" fontWeight="700" sx={{ color: '#f59e0b' }}>{formatCurrency(totalOwed)}</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">Pending Expenses</Typography>
          <Typography variant="h5" fontWeight="700" sx={{ color: 'primary.main' }}>{totalPending}</Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Settlement Table */}
      {summaries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No pending settlements
          </Typography>
          <Typography variant="body2" color="text.disabled">
            All team members have settled their expenses for {currentMonth}
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40px"></TableCell>
                <TableCell>Team Member</TableCell>
                <TableCell align="right">Total Owed</TableCell>
                <TableCell align="center">Pending Expenses</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaries.map((summary) => (
                <React.Fragment key={summary.user}>
                  {/* Main Row */}
                  <TableRow
                    hover
                    onClick={() => handleToggleExpand(summary.user)}
                    sx={{ cursor: 'pointer', '& > *': { borderBottom: expandedUser === summary.user ? 0 : undefined } }}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {expandedUser === summary.user ? <CollapseIcon /> : <ExpandIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="600">
                        {summary.user}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="700" sx={{ color: '#f59e0b' }}>
                        {formatCurrency(summary.total_owed)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${summary.pending_count} expense${summary.pending_count !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: 'primary.main' + '20', color: 'primary.main' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label="Pending"
                        size="small"
                        sx={{ bgcolor: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        startIcon={<SettleIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSettled(summary.user);
                        }}
                        disabled={settlingUser === summary.user}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        {settlingUser === summary.user ? 'Settling...' : 'Mark Settled'}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0, bgcolor: 'action.hover' }}>
                      <Collapse in={expandedUser === summary.user} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, px: 3 }}>
                          <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                            {summary.user}'s Expenses
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Purpose</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {summary.expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                  <TableCell>{formatDate(expense.date)}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={expense.category}
                                      size="small"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {expense.purpose || '-'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight="600">
                                      {formatCurrency(expense.amount_inr)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={expense.status}
                                      size="small"
                                      sx={{
                                        bgcolor: expense.status === 'pending' ? '#f59e0b20' : '#10b98120',
                                        color: expense.status === 'pending' ? '#f59e0b' : '#10b981',
                                        fontSize: '0.7rem',
                                        textTransform: 'capitalize',
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

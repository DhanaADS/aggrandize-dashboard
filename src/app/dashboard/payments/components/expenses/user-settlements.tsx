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
import { UserSettlementSummary, SettlementRecord, ADS_ACCOUNTS } from '@/types/finance';
import { getUserSettlementSummaries, bulkMarkSettled, getSettlementHistory } from '@/lib/finance-api';
import { formatSettlementNotification } from '@/lib/whatsapp/expense-parser';
import { getPhoneByTeamMember } from '@/lib/whatsapp/team-mapping';

interface UserSettlementsProps {
  refreshTrigger?: number;
  adminName?: string;
}

export function UserSettlements({ refreshTrigger, adminName }: UserSettlementsProps) {
  const [summaries, setSummaries] = useState<UserSettlementSummary[]>([]);
  const [history, setHistory] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [settlingUser, setSettlingUser] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summariesData, historyData] = await Promise.all([
        getUserSettlementSummaries(),
        getSettlementHistory()
      ]);
      setSummaries(summariesData || []);
      setHistory(historyData || []);
    } catch (err) {
      setError('Failed to load settlement data');
      console.error('Error fetching settlement data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleToggleExpand = (user: string) => {
    setExpandedUser(expandedUser === user ? null : user);
  };

  const handleToggleHistory = (id: string) => {
    setExpandedHistory(expandedHistory === id ? null : id);
  };

  const handleMarkSettled = async (user: string) => {
    if (!confirm(`Mark all pending expenses for ${user} as settled?`)) return;

    // Get the summary before settling to access expense details
    const summary = summaries.find(s => s.user === user);

    setSettlingUser(user);
    try {
      const result = await bulkMarkSettled(user, adminName);
      if (result) {
        console.log(`Settlement complete: ${result.expenseCount} expenses, ₹${result.totalAmount}`);

        // Send WhatsApp notification
        const userPhone = getPhoneByTeamMember(user);
        if (userPhone && summary) {
          const message = formatSettlementNotification(
            user,
            summary.expenses.map(e => ({ description: e.purpose || e.category, amount_inr: e.amount_inr })),
            result.totalAmount,
            adminName || 'Admin'
          );
          try {
            await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: userPhone, message })
            });
            console.log(`WhatsApp notification sent to ${user} (${userPhone})`);
          } catch (whatsappErr) {
            console.error('Failed to send WhatsApp notification:', whatsappErr);
            // Don't fail the settlement if WhatsApp notification fails
          }
        }
      }
      // Refresh the data
      await fetchData();
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

      {/* Settlement History Section */}
      {history.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            Settlement History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="40px"></TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Team Member</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Expenses</TableCell>
                  <TableCell>Settled By</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record) => (
                  <React.Fragment key={record.id}>
                    <TableRow
                      hover
                      onClick={() => handleToggleHistory(record.id)}
                      sx={{ cursor: 'pointer', '& > *': { borderBottom: expandedHistory === record.id ? 0 : undefined } }}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {expandedHistory === record.id ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(record.settlement_date || record.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="600">
                          {record.from_member}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="700" sx={{ color: '#10b981' }}>
                          {formatCurrency(record.amount_inr)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${record.expenses?.length || 0} item${(record.expenses?.length || 0) !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ bgcolor: 'primary.main' + '20', color: 'primary.main' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.settled_by || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="Settled"
                          size="small"
                          sx={{ bgcolor: '#10b98120', color: '#10b981', fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, bgcolor: 'action.hover' }}>
                        <Collapse in={expandedHistory === record.id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 3 }}>
                            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                              Expenses Settled
                            </Typography>
                            {record.expenses && record.expenses.length > 0 ? (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Purpose</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {record.expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                                      <TableCell>
                                        <Chip
                                          label={expense.category || 'Other'}
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
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No expense details available
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

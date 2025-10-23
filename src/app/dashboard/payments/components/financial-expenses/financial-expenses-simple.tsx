'use client';

import { useState, useEffect, useCallback } from 'react';
import { Subscription, SubscriptionFilters } from '@/types/finance';
import { getSubscriptions } from '@/lib/finance-api';
import { OtherExpensesTab } from './OtherExpensesTab';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  Switch
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const sampleSubscriptions: Subscription[] = []; // Start with empty, rely on API

export function FinancialExpensesSimple() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'other-expenses'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: SubscriptionFilters = { search: searchQuery || undefined, is_active: true };
      const data = await getSubscriptions(filters);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]); // Set to empty on error
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const delayedLoad = setTimeout(() => { loadSubscriptions(); }, 300);
    return () => clearTimeout(delayedLoad);
  }, [loadSubscriptions]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">Expenses</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>Add Expense</Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, newVal) => setActiveTab(newVal)} aria-label="Expenses tabs">
          <Tab label="Subscriptions" value="subscriptions" />
          <Tab label="Other Expenses" value="other-expenses" />
        </Tabs>
      </Box>

      <Box sx={{ pt: 3 }}>
        {activeTab === 'other-expenses' ? (
          <OtherExpensesTab />
        ) : (
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', gap: 2, backgroundColor: 'action.focus' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Platform</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Renewal</TableCell>
                    <TableCell>Paid By</TableCell>
                    <TableCell align="center">Auto-Renew</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    Array.from(new Array(5)).map((_, index) => (
                      <TableRow key={index}>{Array.from(new Array(6)).map((_, i) => <TableCell key={i}><Skeleton /></TableCell>)}</TableRow>
                    ))
                  ) : subscriptions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">No subscriptions found.</TableCell></TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="600">{sub.platform}</Typography>
                          <Typography variant="caption" color="text.secondary">{sub.purpose}</Typography>
                        </TableCell>
                        <TableCell>{sub.plan_type}</TableCell>
                        <TableCell>₹{sub.amount_inr.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{sub.renewal_cycle}</TableCell>
                        <TableCell>{sub.paid_by}</TableCell>
                        <TableCell align="center"><Switch checked={sub.auto_renewal} size="small" readOnly /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

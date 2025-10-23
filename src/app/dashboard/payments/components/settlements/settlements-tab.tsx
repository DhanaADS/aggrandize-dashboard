'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSettlements, updateSettlement } from '@/lib/finance-api';
import { Settlement } from '@/types/finance';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  IconButton
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export function SettlementsTab() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  const loadSettlements = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSettlements = await getSettlements();
      const filtered = allSettlements.filter(s => s.settlement_date && s.settlement_date.startsWith(selectedMonth));
      setSettlements(filtered);
    } catch (error) {
      console.error('Error loading settlements:', error);
      setSettlements([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { loadSettlements(); }, [loadSettlements]);

  const navigateMonth = (direction: number) => {
    const currentDate = new Date(`${selectedMonth}-01`);
    currentDate.setMonth(currentDate.getMonth() + direction);
    setSelectedMonth(currentDate.toISOString().slice(0, 7));
  };

  const handleMarkAsSettled = async (settlementId: string) => {
    const originalSettlements = [...settlements];
    setSettlements(prev => prev.map(s => s.id === settlementId ? { ...s, settlement_status: 'completed' } : s));
    try {
      await updateSettlement(settlementId, { settlement_status: 'completed' });
    } catch (error) {
      console.error('Failed to update settlement:', error);
      setSettlements(originalSettlements); // Revert on error
    }
  };

  const formatMonthDisplay = (monthStr: string) => new Date(`${monthStr}-01`).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">Settlements</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateMonth(-1)}><ArrowBackIos /></IconButton>
          <Typography variant="h6" component="span" sx={{ width: '150px', textAlign: 'center' }}>{formatMonthDisplay(selectedMonth)}</Typography>
          <IconButton onClick={() => navigateMonth(1)}><ArrowForwardIos /></IconButton>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.focus' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>From</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>To</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Purpose</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from(new Array(5)).map((_, i) => <TableRow key={i}>{Array.from(new Array(6)).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
              ) : settlements.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No settlements for {formatMonthDisplay(selectedMonth)}.</TableCell></TableRow>
              ) : (
                settlements.map((settlement) => (
                  <TableRow key={settlement.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>{settlement.from_person}</TableCell>
                    <TableCell>{settlement.to_person}</TableCell>
                    <TableCell>{settlement.purpose}</TableCell>
                    <TableCell align="right">{formatCurrency(settlement.amount_inr)}</TableCell>
                    <TableCell align="center"><Chip label={settlement.settlement_status} size="small" color={settlement.settlement_status === 'completed' ? 'success' : 'warning'} /></TableCell>
                    <TableCell align="center">
                      {settlement.settlement_status !== 'completed' && isCurrentMonth && (
                        <Button variant="contained" size="small" onClick={() => handleMarkAsSettled(settlement.id)}>Mark as Settled</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

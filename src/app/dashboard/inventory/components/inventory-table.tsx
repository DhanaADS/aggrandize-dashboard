'use client';

import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Chip,
  IconButton,
  Typography,
  Link,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { WebsiteInventory, SortConfig, WEBSITE_STATUSES } from '@/types/inventory';

interface InventoryTableProps {
  websites: WebsiteInventory[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  sort: SortConfig;
  selectedIds: string[];
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSortChange: (sort: SortConfig) => void;
  onSelectionChange: (ids: string[]) => void;
  onEdit: (website: WebsiteInventory) => void;
  onDelete: (website: WebsiteInventory) => void;
  loading?: boolean;
}

// Format traffic numbers (1000 -> 1K, 1000000 -> 1M)
function formatTraffic(value: number | null | undefined): string {
  if (!value) return '-';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

// Format currency
function formatCurrency(value: number | null | undefined): string {
  if (!value) return '-';
  return `$${value.toLocaleString()}`;
}

// Boolean indicator component
function BooleanIndicator({ value, trueLabel, falseLabel }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <Tooltip title={trueLabel || 'Yes'}>
      <CheckIcon sx={{ color: 'success.main', fontSize: 18 }} />
    </Tooltip>
  ) : (
    <Tooltip title={falseLabel || 'No'}>
      <CloseIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
    </Tooltip>
  );
}

export function InventoryTable({
  websites,
  totalCount,
  page,
  rowsPerPage,
  sort,
  selectedIds,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  onSelectionChange,
  onEdit,
  onDelete,
  loading,
}: InventoryTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(websites.map((w) => w.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelected);
  };

  const handleSort = (column: keyof WebsiteInventory) => {
    const isAsc = sort.column === column && sort.direction === 'asc';
    onSortChange({ column, direction: isAsc ? 'desc' : 'asc' });
  };

  const copyWebsite = async (website: string, id: string) => {
    await navigator.clipboard.writeText(website);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusConfig = (status: string) => {
    const config = WEBSITE_STATUSES.find(s => s.value === status);
    return config || { label: status, color: '#6b7280' };
  };

  const isAllSelected = websites.length > 0 && selectedIds.length === websites.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < websites.length;

  return (
    <Box>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isSomeSelected}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.column === 'website'}
                  direction={sort.column === 'website' ? sort.direction : 'asc'}
                  onClick={() => handleSort('website')}
                >
                  Website
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sort.column === 'da'}
                  direction={sort.column === 'da' ? sort.direction : 'asc'}
                  onClick={() => handleSort('da')}
                >
                  DA
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sort.column === 'domain_rating'}
                  direction={sort.column === 'domain_rating' ? sort.direction : 'asc'}
                  onClick={() => handleSort('domain_rating')}
                >
                  DR
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sort.column === 'client_price'}
                  direction={sort.column === 'client_price' ? sort.direction : 'asc'}
                  onClick={() => handleSort('client_price')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sort.column === 'organic_traffic'}
                  direction={sort.column === 'organic_traffic' ? sort.direction : 'asc'}
                  onClick={() => handleSort('organic_traffic')}
                >
                  Traffic
                </TableSortLabel>
              </TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="center">Index</TableCell>
              <TableCell align="center">DoF</TableCell>
              <TableCell align="center">News</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {websites.map((website) => {
              const isSelected = selectedIds.includes(website.id);
              const statusConfig = getStatusConfig(website.status);

              return (
                <TableRow
                  key={website.id}
                  hover
                  selected={isSelected}
                  sx={{ opacity: loading ? 0.5 : 1 }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectOne(website.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Link
                        href={`https://${website.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {website.website}
                        <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.5 }} />
                      </Link>
                      <IconButton
                        size="small"
                        onClick={() => copyWebsite(website.website, website.id)}
                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                      >
                        {copiedId === website.id ? (
                          <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <CopyIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                    {website.contact && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {website.contact}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{
                        color: (website.da || 0) >= 60 ? 'success.main' :
                               (website.da || 0) >= 40 ? 'warning.main' : 'text.primary',
                      }}
                    >
                      {website.da || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{
                        color: (website.domain_rating || 0) >= 60 ? 'success.main' :
                               (website.domain_rating || 0) >= 40 ? 'warning.main' : 'text.primary',
                      }}
                    >
                      {website.domain_rating || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600" sx={{ color: 'primary.main' }}>
                      {formatCurrency(website.client_price)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatTraffic(website.organic_traffic)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {website.category || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <BooleanIndicator value={website.is_indexed} trueLabel="Indexed" falseLabel="Not Indexed" />
                  </TableCell>
                  <TableCell align="center">
                    <BooleanIndicator value={website.do_follow} trueLabel="DoFollow" falseLabel="NoFollow" />
                  </TableCell>
                  <TableCell align="center">
                    <BooleanIndicator value={website.news} trueLabel="News Site" falseLabel="Not News" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig.label}
                      size="small"
                      sx={{
                        bgcolor: `${statusConfig.color}20`,
                        color: statusConfig.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => onEdit(website)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onDelete(website)}
                        title="Delete"
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100]}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </Box>
  );
}

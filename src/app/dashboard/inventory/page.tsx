'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Skeleton,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Block as BlacklistIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { WebsiteInventory, InventoryFilters as Filters, SortConfig, InventoryMetrics } from '@/types/inventory';
import inventoryApi from '@/lib/inventory-api';
import { InventoryTable } from './components/inventory-table';
import { InventoryFilters } from './components/inventory-filters';
import { InventoryForm } from './components/inventory-form';

export default function InventoryPage() {
  // Data state
  const [websites, setWebsites] = useState<WebsiteInventory[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<WebsiteInventory | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Table state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sort, setSort] = useState<SortConfig>({ column: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk action menu
  const [bulkAnchorEl, setBulkAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch websites
  const fetchWebsites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getWebsites(filters, page, rowsPerPage, sort);
      setWebsites(response.websites);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, sort]);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const metricsData = await inventoryApi.getMetrics();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await inventoryApi.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchWebsites();
    fetchMetrics();
    fetchCategories();
  }, [fetchWebsites, fetchMetrics, fetchCategories]);

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingWebsite(null);
    fetchWebsites();
    fetchMetrics();
    setSnackbar({
      open: true,
      message: editingWebsite ? 'Website updated successfully' : 'Website added successfully',
      severity: 'success',
    });
  };

  // Handle edit
  const handleEdit = (website: WebsiteInventory) => {
    setEditingWebsite(website);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (website: WebsiteInventory) => {
    if (!confirm(`Are you sure you want to delete ${website.website}?`)) return;

    try {
      await inventoryApi.deleteWebsite(website.id);
      fetchWebsites();
      fetchMetrics();
      setSnackbar({ open: true, message: 'Website deleted successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete website', severity: 'error' });
    }
  };

  // Handle bulk action
  const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate' | 'blacklist') => {
    setBulkAnchorEl(null);

    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} selected websites?`)) {
      return;
    }

    try {
      await inventoryApi.bulkAction({ action, website_ids: selectedIds });
      setSelectedIds([]);
      fetchWebsites();
      fetchMetrics();
      setSnackbar({
        open: true,
        message: `${selectedIds.length} websites ${action === 'delete' ? 'deleted' : 'updated'} successfully`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to ${action} websites`, severity: 'error' });
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await inventoryApi.downloadExport({
        format,
        columns: ['website', 'da', 'domain_rating', 'client_price', 'organic_traffic', 'category', 'status', 'do_follow', 'is_indexed', 'contact'],
        filters,
      });
      setSnackbar({ open: true, message: 'Export started', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Export failed', severity: 'error' });
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Show form view
  if (showForm) {
    return (
      <Box sx={{ p: 3 }}>
        <InventoryForm
          website={editingWebsite}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingWebsite(null);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Inventory Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount.toLocaleString()} websites in inventory
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchWebsites()}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
            Add Website
          </Button>
        </Box>
      </Box>

      {/* Metrics Cards */}
      {metrics && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography variant="h5" fontWeight="600">{(metrics.total_websites || 0).toLocaleString()}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Active</Typography>
            <Typography variant="h5" fontWeight="600" color="success.main">{(metrics.active_websites || 0).toLocaleString()}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Avg DA</Typography>
            <Typography variant="h5" fontWeight="600">{(metrics.avg_da || 0).toFixed(1)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Avg DR</Typography>
            <Typography variant="h5" fontWeight="600">{(metrics.avg_domain_rating || 0).toFixed(1)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Avg Price</Typography>
            <Typography variant="h5" fontWeight="600">${(metrics.avg_client_price || 0).toFixed(0)}</Typography>
          </Paper>
        </Box>
      )}

      {/* Filters */}
      <InventoryFilters
        filters={filters}
        categories={categories}
        showFilters={showFilters}
        onFiltersChange={handleFiltersChange}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
      />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            p: 1.5,
            bgcolor: 'primary.main',
            borderRadius: 1,
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="body2" fontWeight="600">
            {selectedIds.length} selected
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="inherit"
            onClick={(e) => setBulkAnchorEl(e.currentTarget)}
            sx={{ color: 'primary.main' }}
          >
            Actions
          </Button>
          <Menu anchorEl={bulkAnchorEl} open={Boolean(bulkAnchorEl)} onClose={() => setBulkAnchorEl(null)}>
            <MenuItem onClick={() => handleBulkAction('activate')}>
              <ListItemIcon><ActiveIcon color="success" /></ListItemIcon>
              <ListItemText>Activate</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('deactivate')}>
              <ListItemIcon><InactiveIcon color="disabled" /></ListItemIcon>
              <ListItemText>Deactivate</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('blacklist')}>
              <ListItemIcon><BlacklistIcon color="error" /></ListItemIcon>
              <ListItemText>Blacklist</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('delete')} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
          <Button size="small" variant="text" onClick={() => setSelectedIds([])} sx={{ color: 'inherit', ml: 'auto' }}>
            Clear Selection
          </Button>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button size="small" onClick={fetchWebsites} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading State */}
      {loading && websites.length === 0 ? (
        <Box>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 0.5, borderRadius: 1 }} />
          ))}
        </Box>
      ) : websites.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No websites found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {Object.keys(filters).length > 0 ? 'Try adjusting your filters' : 'Add your first website to get started'}
          </Typography>
          {Object.keys(filters).length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
              Add First Website
            </Button>
          )}
        </Paper>
      ) : (
        <Paper>
          <InventoryTable
            websites={websites}
            totalCount={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            sort={sort}
            selectedIds={selectedIds}
            onPageChange={setPage}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage);
              setPage(1);
            }}
            onSortChange={setSort}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </Paper>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

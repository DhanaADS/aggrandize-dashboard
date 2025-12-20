'use client';

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { InventoryFilters as Filters, WEBSITE_STATUSES, AUTHORITY_RANGES, PRICE_RANGES } from '@/types/inventory';

interface InventoryFiltersProps {
  filters: Filters;
  categories: string[];
  showFilters: boolean;
  onFiltersChange: (filters: Filters) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export function InventoryFilters({
  filters,
  categories,
  showFilters,
  onFiltersChange,
  onToggleFilters,
  onClearFilters,
}: InventoryFiltersProps) {
  const updateFilter = (key: keyof Filters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== '' && value !== null
  ).length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Filter Toggle Button */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search websites..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
          }}
        />
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          startIcon={<FilterIcon />}
          onClick={onToggleFilters}
          color={activeFilterCount > 0 ? 'primary' : 'inherit'}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="text" startIcon={<CloseIcon />} onClick={onClearFilters} color="inherit">
            Clear All
          </Button>
        )}
      </Box>

      {/* Expanded Filters Panel */}
      <Collapse in={showFilters}>
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Grid container spacing={2}>
            {/* Status Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) => updateFilter('status', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {WEBSITE_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Category Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ''}
                  label="Category"
                  onChange={(e) => updateFilter('category', e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* DA Range */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>DA Range</InputLabel>
                <Select
                  value={filters.da_min !== undefined ? `${filters.da_min}-${filters.da_max}` : ''}
                  label="DA Range"
                  onChange={(e) => {
                    const [min, max] = (e.target.value as string).split('-').map(Number);
                    onFiltersChange({
                      ...filters,
                      da_min: isNaN(min) ? undefined : min,
                      da_max: isNaN(max) ? undefined : max,
                    });
                  }}
                >
                  <MenuItem value="">Any DA</MenuItem>
                  {AUTHORITY_RANGES.slice(1).map((range) => (
                    <MenuItem key={range.label} value={`${range.min}-${range.max}`}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* DR Range */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>DR Range</InputLabel>
                <Select
                  value={filters.domain_rating_min !== undefined ? `${filters.domain_rating_min}-${filters.domain_rating_max}` : ''}
                  label="DR Range"
                  onChange={(e) => {
                    const [min, max] = (e.target.value as string).split('-').map(Number);
                    onFiltersChange({
                      ...filters,
                      domain_rating_min: isNaN(min) ? undefined : min,
                      domain_rating_max: isNaN(max) ? undefined : max,
                    });
                  }}
                >
                  <MenuItem value="">Any DR</MenuItem>
                  {AUTHORITY_RANGES.slice(1).map((range) => (
                    <MenuItem key={range.label} value={`${range.min}-${range.max}`}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Price Range */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Price Range</InputLabel>
                <Select
                  value={filters.client_price_min !== undefined ? `${filters.client_price_min}-${filters.client_price_max || 'null'}` : ''}
                  label="Price Range"
                  onChange={(e) => {
                    const value = e.target.value as string;
                    if (!value) {
                      onFiltersChange({ ...filters, client_price_min: undefined, client_price_max: undefined });
                    } else {
                      const [min, max] = value.split('-');
                      onFiltersChange({
                        ...filters,
                        client_price_min: parseInt(min) || undefined,
                        client_price_max: max === 'null' ? undefined : parseInt(max),
                      });
                    }
                  }}
                >
                  <MenuItem value="">Any Price</MenuItem>
                  {PRICE_RANGES.slice(1).map((range) => (
                    <MenuItem key={range.label} value={`${range.min}-${range.max || 'null'}`}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Contact Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Contact"
                placeholder="Email..."
                value={filters.contact || ''}
                onChange={(e) => updateFilter('contact', e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Boolean Filters */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Quick Filters
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={filters.is_indexed === true}
                    onChange={(e) => updateFilter('is_indexed', e.target.checked ? true : undefined)}
                  />
                }
                label="Indexed Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={filters.do_follow === true}
                    onChange={(e) => updateFilter('do_follow', e.target.checked ? true : undefined)}
                  />
                }
                label="DoFollow"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={filters.news === true}
                    onChange={(e) => updateFilter('news', e.target.checked ? true : undefined)}
                  />
                }
                label="News Sites"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={filters.sponsored === true}
                    onChange={(e) => updateFilter('sponsored', e.target.checked ? true : undefined)}
                  />
                }
                label="Sponsored"
              />
            </Box>

            {/* Niche Filters */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Accepts Content
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="CBD"
                variant={filters.cbd === true ? 'filled' : 'outlined'}
                color={filters.cbd === true ? 'success' : 'default'}
                onClick={() => updateFilter('cbd', filters.cbd === true ? undefined : true)}
                size="small"
              />
              <Chip
                label="Casino"
                variant={filters.casino === true ? 'filled' : 'outlined'}
                color={filters.casino === true ? 'success' : 'default'}
                onClick={() => updateFilter('casino', filters.casino === true ? undefined : true)}
                size="small"
              />
              <Chip
                label="Dating"
                variant={filters.dating === true ? 'filled' : 'outlined'}
                color={filters.dating === true ? 'success' : 'default'}
                onClick={() => updateFilter('dating', filters.dating === true ? undefined : true)}
                size="small"
              />
              <Chip
                label="Crypto"
                variant={filters.crypto === true ? 'filled' : 'outlined'}
                color={filters.crypto === true ? 'success' : 'default'}
                onClick={() => updateFilter('crypto', filters.crypto === true ? undefined : true)}
                size="small"
              />
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

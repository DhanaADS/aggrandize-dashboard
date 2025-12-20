'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { WebsiteInventory } from '@/types/inventory';

interface PublicationSelectorProps {
  value: WebsiteInventory | null;
  onChange: (publication: WebsiteInventory | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export function PublicationSelector({
  value,
  onChange,
  error,
  helperText,
  disabled,
}: PublicationSelectorProps) {
  const [options, setOptions] = useState<WebsiteInventory[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced search
  const searchPublications = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: 'active',
        page: '1',
        limit: '20',
      });

      const response = await fetch(`/api/inventory?${params}`);
      const data = await response.json();

      if (data.success) {
        setOptions(data.websites || []);
      }
    } catch (err) {
      console.error('Error searching publications:', err);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPublications(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchPublications]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={(option) => option.website}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      filterOptions={(x) => x} // Disable client-side filtering since we're using server search
      noOptionsText={inputValue.length < 2 ? "Type at least 2 characters to search" : "No publications found"}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Publication"
          placeholder="Type website name..."
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...restProps } = props;
        return (
          <Box
            component="li"
            key={key}
            {...restProps}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start !important',
              py: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body1" fontWeight={500}>
                {option.website}
              </Typography>
              {option.category && (
                <Chip label={option.category} size="small" variant="outlined" />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              {option.da !== null && option.da !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  DA: {option.da}
                </Typography>
              )}
              {option.domain_rating !== null && option.domain_rating !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  DR: {option.domain_rating}
                </Typography>
              )}
              {option.client_price !== null && option.client_price !== undefined && (
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  ${option.client_price}
                </Typography>
              )}
              {option.organic_traffic !== null && option.organic_traffic !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  Traffic: {option.organic_traffic.toLocaleString()}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
    />
  );
}

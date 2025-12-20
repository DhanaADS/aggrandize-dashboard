'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { WebsiteInventory, WebsiteFormData, WEBSITE_STATUSES, CATEGORIES } from '@/types/inventory';
import inventoryApi from '@/lib/inventory-api';

interface InventoryFormProps {
  website: WebsiteInventory | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const defaultFormData: WebsiteFormData = {
  website: '',
  contact: '',
  client_price: undefined,
  price: undefined,
  domain_rating: undefined,
  da: undefined,
  backlinks: undefined,
  organic_traffic: undefined,
  us_traffic: undefined,
  uk_traffic: undefined,
  canada_traffic: undefined,
  is_indexed: true,
  ai_overview: false,
  chatgpt: false,
  perplexity: false,
  gemini: false,
  copilot: false,
  do_follow: true,
  news: false,
  sponsored: false,
  cbd: false,
  casino: false,
  dating: false,
  crypto: false,
  category: '',
  tat: undefined,
  status: 'active',
  notes: '',
};

export function InventoryForm({ website, onSuccess, onCancel }: InventoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<WebsiteFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (website) {
      setFormData({
        website: website.website,
        contact: website.contact || '',
        client_price: website.client_price,
        price: website.price,
        domain_rating: website.domain_rating,
        da: website.da,
        backlinks: website.backlinks,
        organic_traffic: website.organic_traffic,
        us_traffic: website.us_traffic,
        uk_traffic: website.uk_traffic,
        canada_traffic: website.canada_traffic,
        is_indexed: website.is_indexed,
        ai_overview: website.ai_overview,
        chatgpt: website.chatgpt,
        perplexity: website.perplexity,
        gemini: website.gemini,
        copilot: website.copilot,
        do_follow: website.do_follow,
        news: website.news,
        sponsored: website.sponsored,
        cbd: website.cbd,
        casino: website.casino,
        dating: website.dating,
        crypto: website.crypto,
        category: website.category || '',
        tat: website.tat,
        status: website.status,
        notes: website.notes || '',
      });
    }
  }, [website]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.website?.trim()) {
      newErrors.website = 'Website is required';
    } else {
      // Clean and validate website format
      const cleanedWebsite = formData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(cleanedWebsite)) {
        newErrors.website = 'Invalid website format';
      }
    }

    if (formData.domain_rating !== undefined && (formData.domain_rating < 0 || formData.domain_rating > 100)) {
      newErrors.domain_rating = 'DR must be 0-100';
    }

    if (formData.da !== undefined && (formData.da < 0 || formData.da > 100)) {
      newErrors.da = 'DA must be 0-100';
    }

    if (formData.client_price !== undefined && formData.client_price < 0) {
      newErrors.client_price = 'Price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Clean website URL
      const cleanedData = {
        ...formData,
        website: formData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
      };

      if (website) {
        await inventoryApi.updateWebsite(website.id, cleanedData);
      } else {
        await inventoryApi.createWebsite(cleanedData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save website');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof WebsiteFormData) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    const value = e.target.value;
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleNumberChange = (field: keyof WebsiteFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSwitchChange = (field: keyof WebsiteFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.checked });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            {website ? 'Edit Website' : 'Add Website'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {website ? `Editing ${website.website}` : 'Add a new website to inventory'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<CloseIcon />} onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : website ? 'Update' : 'Create'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Basic Information */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Basic Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Website Domain"
            required
            placeholder="example.com"
            value={formData.website}
            onChange={handleChange('website')}
            error={!!errors.website}
            helperText={errors.website}
            disabled={!!website}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Contact Email"
            type="email"
            placeholder="contact@example.com"
            value={formData.contact}
            onChange={handleChange('contact')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) => setFormData({ ...formData, category: e.target.value as string })}
            >
              <MenuItem value="">None</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* SEO Metrics */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        SEO Metrics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="DA"
            type="number"
            inputProps={{ min: 0, max: 100 }}
            value={formData.da ?? ''}
            onChange={handleNumberChange('da')}
            error={!!errors.da}
            helperText={errors.da}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="DR"
            type="number"
            inputProps={{ min: 0, max: 100 }}
            value={formData.domain_rating ?? ''}
            onChange={handleNumberChange('domain_rating')}
            error={!!errors.domain_rating}
            helperText={errors.domain_rating}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="Organic Traffic"
            type="number"
            inputProps={{ min: 0 }}
            value={formData.organic_traffic ?? ''}
            onChange={handleNumberChange('organic_traffic')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="Backlinks"
            type="number"
            inputProps={{ min: 0 }}
            value={formData.backlinks ?? ''}
            onChange={handleNumberChange('backlinks')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="TAT (days)"
            type="number"
            inputProps={{ min: 0 }}
            value={formData.tat ?? ''}
            onChange={handleNumberChange('tat')}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value as WebsiteFormData['status'] })}
            >
              {WEBSITE_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Pricing */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Pricing
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            label="Client Price"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={formData.client_price ?? ''}
            onChange={handleNumberChange('client_price')}
            error={!!errors.client_price}
            helperText={errors.client_price}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            label="Cost Price"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={formData.price ?? ''}
            onChange={handleNumberChange('price')}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Boolean Flags */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Site Features
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.is_indexed} onChange={handleSwitchChange('is_indexed')} />}
            label="Indexed"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.do_follow} onChange={handleSwitchChange('do_follow')} />}
            label="DoFollow"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.news} onChange={handleSwitchChange('news')} />}
            label="News Site"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.sponsored} onChange={handleSwitchChange('sponsored')} />}
            label="Sponsored"
          />
        </Grid>
      </Grid>

      {/* Niche Acceptance */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Accepts Content
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.cbd} onChange={handleSwitchChange('cbd')} color="warning" />}
            label="CBD"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.casino} onChange={handleSwitchChange('casino')} color="warning" />}
            label="Casino"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.dating} onChange={handleSwitchChange('dating')} color="warning" />}
            label="Dating"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControlLabel
            control={<Switch checked={formData.crypto} onChange={handleSwitchChange('crypto')} color="warning" />}
            label="Crypto"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Notes */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Additional Notes
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Notes"
        value={formData.notes}
        onChange={handleChange('notes')}
        placeholder="Any additional information about this website..."
      />
    </Box>
  );
}

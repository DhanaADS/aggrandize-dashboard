# AGGRANDIZE Design System

Reference guide for building consistent UI components in the AGGRANDIZE Dashboard.

---

## Color Palette

### Primary Colors
```tsx
primary: '#00A99D'        // Teal - Main brand color
primaryLight: '#00A99D20' // Background tint (20% opacity)
primaryHover: '#008B82'   // Darker hover state
```

### Accent Colors (Neon/Gaming)
```tsx
neonGreen: '#00ff88'      // Success highlights, gradients
neonBlue: '#00d4ff'       // Info highlights, gradients
```

### Status Colors
```tsx
const STATUS_COLORS = {
  success: '#10B981',     // Green - completed, paid, live
  warning: '#F59E0B',     // Amber - pending, in progress
  error: '#EF4444',       // Red - rejected, cancelled, overdue
  info: '#3B82F6',        // Blue - approved, confirmed
  draft: '#64748b',       // Gray - draft, inactive
  purple: '#8B5CF6'       // Purple - content ready
};
```

### Text Colors
```tsx
textPrimary: 'text.primary'     // Main text
textSecondary: 'text.secondary' // Descriptions
textDisabled: 'text.disabled'   // Placeholders
```

---

## Typography

### Headings
```tsx
// Page Title (H3)
<Typography variant="h3" fontWeight="700" sx={{ letterSpacing: '-0.025em' }}>

// Section Title (H5)
<Typography variant="h5" fontWeight="600">

// Card Title (H6)
<Typography variant="h6" fontWeight="600">
```

### Body Text
```tsx
// Primary body
<Typography variant="body1" color="text.primary">

// Secondary body
<Typography variant="body2" color="text.secondary">

// Caption
<Typography variant="caption" color="text.disabled">

// Bold value
<Typography variant="body2" fontWeight="600">
```

---

## Component Templates

### Page Layout
```tsx
<Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
  {/* Page Header */}
  <Box sx={{ mb: 4 }}>
    <Typography variant="h3" fontWeight="700" sx={{ color: 'text.primary', mb: 0.5, letterSpacing: '-0.025em' }}>
      Page Title
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
      Page description goes here.
    </Typography>
  </Box>

  {/* Tab Navigation */}
  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
      <Tab value="tab1" label="Tab 1" icon={<Icon />} iconPosition="start"
           sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }} />
    </Tabs>
  </Box>

  {/* Content */}
  <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
    {/* Tab content */}
  </Paper>
</Box>
```

### Tab Content Header
```tsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
  <Box>
    <Typography variant="h5" fontWeight="600">Section Title</Typography>
    <Typography variant="body2" color="text.secondary">
      {count} items found
    </Typography>
  </Box>
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button variant="outlined" startIcon={<FilterIcon />}>Filters</Button>
    <Button variant="contained" startIcon={<AddIcon />}>Add New</Button>
  </Box>
</Box>
```

### Filter Panel (Collapsible)
```tsx
<Collapse in={showFilters}>
  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1,
             border: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle2" fontWeight="600">Filter Items</Typography>
      {hasActiveFilters && (
        <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters}>Clear All</Button>
      )}
    </Box>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <TextField fullWidth size="small" label="Search" />
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Category</InputLabel>
          <Select label="Category">{/* options */}</Select>
        </FormControl>
      </Grid>
    </Grid>
  </Box>
</Collapse>
```

### Status Chip
```tsx
const STATUS_COLORS = {
  pending: '#f59e0b',
  paid: '#10b981',
  approved: '#3b82f6',
  rejected: '#ef4444'
};

<Chip
  label={STATUS_LABELS[status]}
  size="small"
  sx={{
    bgcolor: `${STATUS_COLORS[status]}20`,
    color: STATUS_COLORS[status],
    fontWeight: 600,
    fontSize: '0.75rem'
  }}
/>
```

### Data Table
```tsx
<TableContainer sx={{ overflowX: 'auto' }}>
  <Table sx={{ minWidth: 800 }}>
    <TableHead>
      <TableRow>
        <TableCell>Column 1</TableCell>
        <TableCell align="right">Amount</TableCell>
        <TableCell>Status</TableCell>
        <TableCell align="center">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id} hover>
          <TableCell>
            <Typography variant="body2" fontWeight="500">{item.name}</Typography>
            <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" fontWeight="600">₹{item.amount.toLocaleString()}</Typography>
          </TableCell>
          <TableCell>
            <Chip label={item.status} size="small" sx={{...}} />
          </TableCell>
          <TableCell align="center">
            {/* Action buttons */}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

### Action Buttons (Table Row)
```tsx
<Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
  <IconButton size="small" title="View"><VisibilityIcon fontSize="small" /></IconButton>
  <IconButton size="small" title="Edit"><EditIcon fontSize="small" /></IconButton>
  <IconButton size="small" title="Delete" sx={{ color: 'error.main' }}>
    <DeleteIcon fontSize="small" />
  </IconButton>
</Box>
```

### Form Dialog
```tsx
<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
  <DialogTitle>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6" fontWeight="600">Dialog Title</Typography>
      <IconButton onClick={onClose}><CloseIcon /></IconButton>
    </Box>
  </DialogTitle>
  <DialogContent>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Field" required />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Notes" multiline rows={3} />
      </Grid>
    </Grid>
  </DialogContent>
  <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
    <Button variant="outlined" onClick={onClose}>Cancel</Button>
    <Button variant="contained" onClick={handleSubmit}>Save</Button>
  </DialogActions>
</Dialog>
```

### Empty State
```tsx
<Box sx={{ textAlign: 'center', py: 6 }}>
  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
    No items found
  </Typography>
  <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
    {hasFilters ? 'Try adjusting your filters' : 'Create your first item to get started'}
  </Typography>
  {!hasFilters && (
    <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
      Create First Item
    </Button>
  )}
</Box>
```

### Loading State (Skeleton)
```tsx
<Box>
  {[1, 2, 3, 4, 5].map((i) => (
    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
  ))}
</Box>
```

### Dashboard Card
```tsx
<Paper sx={{ p: 0 }}>
  <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
    <Typography variant="h6" fontWeight="600">Card Title</Typography>
  </Box>
  <Box sx={{ p: 3 }}>
    {/* Card content */}
  </Box>
</Paper>
```

### Quick Stat Card
```tsx
<Paper sx={{ p: 3 }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
    <Box sx={{
      width: 48, height: 48, borderRadius: 1,
      backgroundColor: `${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color
    }}>
      <Icon />
    </Box>
    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
      +12%
    </Typography>
  </Box>
  <Typography variant="h4" fontWeight="700" sx={{ mb: 0.5 }}>₹1,234</Typography>
  <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
</Paper>
```

---

## Spacing Guidelines

```tsx
// Page padding
p: { xs: 2, md: 3 }  // 16px mobile, 24px desktop

// Section margin
mb: 4  // 32px between sections

// Card padding
p: { xs: 2, sm: 3, md: 4 }

// Button gap
gap: 2  // 16px between buttons

// Icon button gap
gap: 0.5  // 4px between icon buttons

// Grid spacing
spacing={2}  // 16px grid gap
```

---

## Standard Imports

```tsx
import {
  Box, Paper, Typography, Button, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Skeleton, Alert, Collapse, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Tabs, Tab
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
```

---

## Usage

When creating new components:
1. Use MUI sx system (no external CSS modules)
2. Follow the status color conventions
3. Use Typography variants consistently
4. Apply responsive spacing patterns
5. Use Dialog for forms, not inline forms
6. Include empty and loading states

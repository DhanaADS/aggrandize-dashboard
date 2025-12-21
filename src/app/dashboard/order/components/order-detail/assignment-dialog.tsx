'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentFormData) => Promise<void>;
  itemDetails: {
    website: string;
    keyword: string;
  };
}

export interface AssignmentFormData {
  assigned_to: string;
  due_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
}

const ALL_TEAM_MEMBERS = [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhana' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'normal', label: 'Normal', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export function AssignmentDialog({ open, onClose, onSubmit, itemDetails }: AssignmentDialogProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    assigned_to: '',
    due_date: '',
    priority: 'normal',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.assigned_to) {
      setError('Please select a team member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        assigned_to: '',
        due_date: '',
        priority: 'normal',
        notes: '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign item');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        assigned_to: '',
        due_date: '',
        priority: 'normal',
        notes: '',
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign to Team Member</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
          <strong>{itemDetails.website}</strong>
          <br />
          Keyword: {itemDetails.keyword}
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth required>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={formData.assigned_to}
                label="Assign To"
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                {ALL_TEAM_MEMBERS.map((member) => (
                  <MenuItem key={member.email} value={member.email}>
                    {member.name} ({member.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as AssignmentFormData['priority'] })
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <span style={{ color: option.color, fontWeight: 600 }}>{option.label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Assignment Notes"
              multiline
              rows={3}
              placeholder="Special instructions or requirements for the assigned team member..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.assigned_to}>
          {loading ? 'Assigning...' : 'Assign Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

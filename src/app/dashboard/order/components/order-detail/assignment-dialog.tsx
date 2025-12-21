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
  Box,
  Typography,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { OrderItemAssignment, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/orders';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentFormData) => Promise<void>;
  onRemoveAssignment?: (assignmentId: string) => Promise<void>;
  itemDetails: {
    website: string;
    keyword: string;
  };
  existingAssignments?: OrderItemAssignment[];
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

export function AssignmentDialog({
  open,
  onClose,
  onSubmit,
  onRemoveAssignment,
  itemDetails,
  existingAssignments = [],
}: AssignmentDialogProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    assigned_to: '',
    due_date: '',
    priority: 'normal',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out already-assigned team members
  const assignedEmails = existingAssignments.map(a => a.assigned_to);
  const availableMembers = ALL_TEAM_MEMBERS.filter(
    member => !assignedEmails.includes(member.email)
  );

  const handleSubmit = async () => {
    if (!formData.assigned_to) {
      setError('Please select a team member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      // Reset form but don't close - allow adding more
      setFormData({
        assigned_to: '',
        due_date: '',
        priority: 'normal',
        notes: '',
      });
      // Close if no more available members
      if (availableMembers.length <= 1) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign item');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!onRemoveAssignment) return;

    setRemovingId(assignmentId);
    try {
      await onRemoveAssignment(assignmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClose = () => {
    if (!loading && !removingId) {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingAssignments.length > 0 ? 'Manage Assignments' : 'Assign to Team Member'}
      </DialogTitle>
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

        {/* Existing Assignments */}
        {existingAssignments.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Current Assignments ({existingAssignments.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {existingAssignments.map((assignment) => (
                <Box
                  key={assignment.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="600">
                      {assignment.assigned_to.split('@')[0]}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={PRIORITY_LABELS[assignment.priority]}
                        size="small"
                        sx={{
                          bgcolor: `${PRIORITY_COLORS[assignment.priority]}20`,
                          color: PRIORITY_COLORS[assignment.priority],
                          fontSize: '0.65rem',
                          height: 18,
                        }}
                      />
                      {assignment.due_date && (
                        <Typography variant="caption" color="text.secondary">
                          Due: {formatDate(assignment.due_date)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {onRemoveAssignment && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={removingId === assignment.id}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
            {availableMembers.length > 0 && <Divider sx={{ mt: 2 }} />}
          </Box>
        )}

        {/* Add New Assignment Form */}
        {availableMembers.length > 0 ? (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              {existingAssignments.length > 0 ? 'Add Another Assignment' : 'Add Assignment'}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    value={formData.assigned_to}
                    label="Assign To"
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  >
                    {availableMembers.map((member) => (
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
                  rows={2}
                  placeholder="Special instructions or requirements..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </>
        ) : (
          existingAssignments.length > 0 && (
            <Alert severity="success" sx={{ mt: 1 }}>
              All team members have been assigned to this item.
            </Alert>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading || !!removingId}>
          {existingAssignments.length > 0 && availableMembers.length === 0 ? 'Close' : 'Cancel'}
        </Button>
        {availableMembers.length > 0 && (
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.assigned_to}>
            {loading ? 'Assigning...' : 'Add Assignment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

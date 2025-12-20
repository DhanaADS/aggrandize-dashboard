'use client';

import { ProcessingOrderItem } from '@/types/processing';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Stack
} from '@mui/material';
import {
  Language as WebsiteIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import {
  PROCESSING_STATUS_LABELS,
  PROCESSING_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS
} from '@/types/processing';

interface TaskCardProps {
  task: ProcessingOrderItem;
  onViewDetails: (task: ProcessingOrderItem) => void;
  onUpdateStatus: (task: ProcessingOrderItem) => void;
}

export function TaskCard({ task, onViewDetails, onUpdateStatus }: TaskCardProps) {
  const isOverdue = task.assignment?.due_date && new Date(task.assignment.due_date) < new Date();
  const dueDate = task.assignment?.due_date ? new Date(task.assignment.due_date).toLocaleDateString() : 'No due date';

  return (
    <Card
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {task.keyword}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <WebsiteIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {task.website}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
            <Chip
              label={PROCESSING_STATUS_LABELS[task.processing_status]}
              size="small"
              sx={{
                backgroundColor: PROCESSING_STATUS_COLORS[task.processing_status] + '20',
                color: PROCESSING_STATUS_COLORS[task.processing_status],
                fontWeight: 600,
                border: `1px solid ${PROCESSING_STATUS_COLORS[task.processing_status]}40`
              }}
            />
            {task.assignment?.priority && (
              <Chip
                label={TASK_PRIORITY_LABELS[task.assignment.priority]}
                size="small"
                sx={{
                  backgroundColor: TASK_PRIORITY_COLORS[task.assignment.priority] + '20',
                  color: TASK_PRIORITY_COLORS[task.assignment.priority],
                  fontWeight: 600,
                  border: `1px solid ${TASK_PRIORITY_COLORS[task.assignment.priority]}40`
                }}
              />
            )}
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CalendarIcon fontSize="small" sx={{ color: isOverdue ? 'error.main' : 'text.secondary' }} />
          <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.secondary'} fontWeight={isOverdue ? 600 : 400}>
            Due: {dueDate}
          </Typography>
          {isOverdue && (
            <Chip
              icon={<WarningIcon />}
              label="OVERDUE"
              size="small"
              color="error"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        {task.order && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Order: {task.order.order_number} - {task.order.client_name}
          </Typography>
        )}

        <Stack direction="row" spacing={1} mt={2}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => onViewDetails(task)}
            fullWidth
          >
            View Details
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onUpdateStatus(task)}
            fullWidth
          >
            Update Status
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

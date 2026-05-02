import { Chip } from '@mui/material';
import { OrderStatus } from '../types/models';

const statusMap: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  NEW: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success'
};

export const StatusChip = ({ status }: { status: OrderStatus }) => (
  <Chip label={status} color={statusMap[status] ?? 'default'} size="small" />
);

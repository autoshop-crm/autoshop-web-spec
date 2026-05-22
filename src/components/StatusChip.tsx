import { Chip } from '@mui/material';
import { OrderStatus } from '../types/models';
import { getOrderStatusLabel, getOrderStatusTone } from '../utils/orderStatus';

export const StatusChip = ({ status }: { status: OrderStatus }) => (
  <Chip label={getOrderStatusLabel(status)} color={getOrderStatusTone(status)} size="small" />
);

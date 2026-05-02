import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../api/ordersApi';
import { AppAlert } from '../../components/AppAlert';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { StatusChip } from '../../components/StatusChip';
import { Order, OrderStatus } from '../../types/models';
import { formatDateTime } from '../../utils/format';

const statuses: OrderStatus[] = ['NEW', 'IN_PROGRESS', 'COMPLETED'];

export const OrdersPage = () => {
  const [status, setStatus] = useState<OrderStatus>('NEW');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await ordersApi.getByStatus(status);
      setOrders(data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить заказы.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus('NEW');
    setOrders([]);
    setError(null);
    setSearched(false);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Заказы</Typography>
        <Button component={Link} to="/orders/new" variant="contained" startIcon={<AddRoundedIcon />}>
          Добавить
        </Button>
      </Stack>

      <SectionCard title="Список заказов">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
          <TextField select fullWidth label="Статус" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
            {statuses.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadOrders()}>
            Найти
          </Button>
          <Button variant="text" onClick={reset}>
            Сбросить
          </Button>
        </Stack>

        {error && <AppAlert message={error} onRetry={() => void loadOrders()} />}
        {loading && <LoadingTable />}
        {!loading && !error && searched && orders.length === 0 && (
          <EmptyState
            title="Ничего не найдено"
            description="Для выбранного статуса пока нет заказов."
            action={<EmptyStateResetButton onClick={reset} label="Очистить фильтры" />}
          />
        )}
        {!loading && !error && orders.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Клиент</TableCell>
                  <TableCell>Автомобиль</TableCell>
                  <TableCell>Проблема</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Создан</TableCell>
                  <TableCell align="right">Действие</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customerId}</TableCell>
                    <TableCell>{order.vehicleId}</TableCell>
                    <TableCell>{order.problem}</TableCell>
                    <TableCell><StatusChip status={order.status} /></TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/orders/${order.id}`} size="small">
                        Открыть
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Stack>
  );
};

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customersApi';
import { loyaltyApi } from '../../api/loyaltyApi';
import { ordersApi } from '../../api/ordersApi';
import { vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { DetailGrid } from '../../components/DetailGrid';
import { EmptyState } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { StatusChip } from '../../components/StatusChip';
import { AuthUser, Customer, LoyaltyAccount, Order, Vehicle } from '../../types/models';
import { formatDateTime, fullName } from '../../utils/format';
import { hasAnyRole } from '../../utils/roles';

export const CustomerDetailsPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const navigate = useNavigate();
  const { customerId = '' } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showLoyalty = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerData, vehiclesData, ordersData] = await Promise.all([
        customersApi.getById(customerId),
        vehiclesApi.getByCustomerId(customerId),
        ordersApi.getByCustomerId(customerId)
      ]);
      setCustomer(customerData);
      setVehicles(vehiclesData);
      setOrders(ordersData);

      if (showLoyalty) {
        const loyaltyData = await loyaltyApi.getAccountByCustomerId(Number(customerId));
        setLoyalty(loyaltyData);
      }
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить карточку клиента.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, [customerId]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>Назад</Button>
        <Typography variant="h4">{customer ? fullName(customer.firstName, customer.lastName) : 'Карточка клиента'}</Typography>
      </Stack>

      {error && <AppAlert message={error} onRetry={() => void loadPage()} />}
      {loading && <LoadingTable />}
      {!loading && !error && customer && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: showLoyalty ? 8 : 12 }}>
            <SectionCard title="Основная информация">
              <DetailGrid items={[
                { label: 'ID', value: customer.id },
                { label: 'Email', value: customer.email },
                { label: 'Телефон', value: customer.phoneNumber },
                { label: 'Создан', value: formatDateTime(customer.createdAt) },
                { label: 'Обновлен', value: formatDateTime(customer.updatedAt) }
              ]} />
            </SectionCard>
          </Grid>

          {showLoyalty && loyalty && (
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Loyalty">
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StarRoundedIcon color="primary" />
                    <Typography variant="h6">{loyalty.pointsBalance} баллов</Typography>
                  </Stack>
                  <Typography color="text.secondary">Tier: {loyalty.currentTierName ?? '—'}</Typography>
                  <Typography color="text.secondary">Начислено всего: {loyalty.totalPointsEarned}</Typography>
                  <Typography color="text.secondary">Списано всего: {loyalty.totalPointsSpent}</Typography>
                </Stack>
              </SectionCard>
            </Grid>
          )}

          <Grid size={12}>
            <SectionCard title="Автомобили клиента" action={<Button component={Link} to={`/vehicles/new?customerId=${customer.id}`} variant="contained" startIcon={<AddRoundedIcon />}>Добавить авто</Button>}>
              {vehicles.length === 0 ? (
                <EmptyState title="Автомобилей пока нет" description="Создайте первый автомобиль для этого клиента." />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Марка / модель</TableCell><TableCell>VIN</TableCell><TableCell>Госномер</TableCell><TableCell align="right">Действие</TableCell></TableRow></TableHead>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} hover>
                          <TableCell>{vehicle.id}</TableCell>
                          <TableCell>{`${vehicle.brand} ${vehicle.model}`}</TableCell>
                          <TableCell>{vehicle.vin}</TableCell>
                          <TableCell>{vehicle.licensePlate}</TableCell>
                          <TableCell align="right"><Button component={Link} to={`/vehicles/${vehicle.id}`} size="small">Открыть</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>
          </Grid>

          <Grid size={12}>
            <SectionCard title="Заказы клиента" action={<Button component={Link} to={`/orders/new?customerId=${customer.id}`} variant="outlined" startIcon={<AddRoundedIcon />}>Создать заказ</Button>}>
              {orders.length === 0 ? (
                <EmptyState title="Заказов пока нет" description="Создайте первый заказ для этого клиента." />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Проблема</TableCell><TableCell>Статус</TableCell><TableCell>Создан</TableCell><TableCell align="right">Действие</TableCell></TableRow></TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.problem}</TableCell>
                          <TableCell><StatusChip status={order.status} /></TableCell>
                          <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                          <TableCell align="right"><Button component={Link} to={`/orders/${order.id}`} size="small">Открыть</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
};

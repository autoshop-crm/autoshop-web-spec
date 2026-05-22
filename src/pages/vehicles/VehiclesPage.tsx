import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { AccessDeniedState } from '../../components/AccessDeniedState';
import { CustomerLookupField } from '../../components/CustomerLookupField';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, Customer, Vehicle } from '../../types/models';
import { formatDateTime, fullName } from '../../utils/format';
import { hasAnyRole } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiErrors';

export const VehiclesPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const loadVehicles = async () => {
    if (!selectedCustomer) {
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await vehiclesApi.getByCustomerId(selectedCustomer.id);
      setVehicles(data);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Не удалось загрузить автомобили выбранного клиента.', {
        badRequest: 'Не удалось выполнить поиск автомобилей по выбранному клиенту.',
        notFound: 'Автомобили для выбранного клиента не найдены.',
        conflict: 'Карточка клиента или список автомобилей сейчас обновляются. Повтори запрос.'
      }));
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedCustomer(null);
    setVehicles([]);
    setError(null);
    setSearched(false);
  };

  if (!hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'])) {
    return <AccessDeniedState description="Раздел автомобилей доступен только staff-ролям CRM." />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Автомобили</Typography>
        <Button component={Link} to="/vehicles/new" variant="contained" startIcon={<AddRoundedIcon />}>
          Добавить
        </Button>
      </Stack>

      <SectionCard title="Поиск автомобилей">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          <Stack flex={1}>
            <CustomerLookupField
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              helperText="Выберите клиента для просмотра его автомобилей"
              createCustomerPath="/customers?create=1"
            />
          </Stack>
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadVehicles()} disabled={!selectedCustomer}>
            Найти
          </Button>
          <Button variant="text" onClick={reset}>
            Сбросить
          </Button>
        </Stack>

        {selectedCustomer && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Выбран клиент: {fullName(selectedCustomer.firstName, selectedCustomer.lastName)} · {selectedCustomer.email} · {selectedCustomer.phoneNumber}
          </Alert>
        )}

        {error && <AppAlert message={error} onRetry={() => void loadVehicles()} />}
        {loading && <LoadingTable />}
        {!loading && !error && searched && vehicles.length === 0 && (
          <EmptyState
            title="Ничего не найдено"
            description="Для этого клиента автомобили пока не зарегистрированы."
            action={<EmptyStateResetButton onClick={reset} label="Очистить фильтры" />}
          />
        )}
        {!loading && !error && vehicles.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Клиент</TableCell>
                  <TableCell>Марка / модель</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>Обновлен</TableCell>
                  <TableCell align="right">Действие</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>{vehicle.id}</TableCell>
                    <TableCell>{fullName(selectedCustomer?.firstName, selectedCustomer?.lastName)}</TableCell>
                    <TableCell>{`${vehicle.brand} ${vehicle.model}`}</TableCell>
                    <TableCell>{vehicle.vin}</TableCell>
                    <TableCell>{formatDateTime(vehicle.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/vehicles/${vehicle.id}`} size="small">
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

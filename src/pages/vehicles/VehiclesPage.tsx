import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { Vehicle } from '../../types/models';
import { formatDateTime } from '../../utils/format';

export const VehiclesPage = () => {
  const [customerId, setCustomerId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const loadVehicles = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await vehiclesApi.getByCustomerId(customerId);
      setVehicles(data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить автомобили. Укажите customerId.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCustomerId('');
    setVehicles([]);
    setError(null);
    setSearched(false);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Автомобили</Typography>
        <Button component={Link} to="/vehicles/new" variant="contained" startIcon={<AddRoundedIcon />}>
          Добавить
        </Button>
      </Stack>

      <SectionCard title="Поиск автомобилей">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
          <TextField
            fullWidth
            label="Customer ID"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadVehicles()} disabled={!customerId}>
            Найти
          </Button>
          <Button variant="text" onClick={reset}>
            Сбросить
          </Button>
        </Stack>

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
                    <TableCell>{vehicle.customerId}</TableCell>
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

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Button, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customersApi';
import { vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { DetailGrid } from '../../components/DetailGrid';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { Customer, Vehicle } from '../../types/models';
import { formatDateTime, fullName } from '../../utils/format';

export const VehicleDetailsPage = () => {
  const navigate = useNavigate();
  const { vehicleId = '' } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const vehicleData = await vehiclesApi.getById(vehicleId);
      setVehicle(vehicleData);
      const customerData = await customersApi.getById(vehicleData.customerId);
      setCustomer(customerData);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить карточку автомобиля.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, [vehicleId]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <Typography variant="h4">{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Карточка автомобиля'}</Typography>
      </Stack>

      {error && <AppAlert message={error} onRetry={() => void loadPage()} />}
      {loading && <LoadingTable />}
      {!loading && !error && vehicle && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard title="Основная информация">
              <DetailGrid
                items={[
                  { label: 'ID', value: vehicle.id },
                  { label: 'Клиент', value: customer ? fullName(customer.firstName, customer.lastName) : vehicle.customerId },
                  { label: 'VIN', value: vehicle.vin },
                  { label: 'Госномер', value: vehicle.licensePlate },
                  { label: 'Марка', value: vehicle.brand },
                  { label: 'Модель', value: vehicle.model },
                  { label: 'Создан', value: formatDateTime(vehicle.createdAt) },
                  { label: 'Обновлен', value: formatDateTime(vehicle.updatedAt) }
                ]}
              />
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard title="Связанные данные">
              <Stack spacing={2}>
                <Button component={Link} to={`/customers/${vehicle.customerId}`} variant="outlined">
                  Открыть клиента
                </Button>
                {vehicle.umapiCatalogLinkedAt && (
                  <Typography color="text.secondary">
                    Каталог UMAPI привязан: {formatDateTime(vehicle.umapiCatalogLinkedAt)}
                  </Typography>
                )}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
};

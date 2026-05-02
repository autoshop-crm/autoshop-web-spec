import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ordersApi } from '../../api/ordersApi';
import { vehiclesApi } from '../../api/vehiclesApi';
import { Vehicle } from '../../types/models';

const schema = z.object({
  customerId: z.coerce.number().int().positive('Укажите customerId'),
  vehicleId: z.coerce.number().int().positive('Укажите vehicleId'),
  employeeId: z.string().optional(),
  problem: z.string().min(5, 'Опишите проблему').max(1000)
});

type OrderFormValues = z.infer<typeof schema>;

export const OrderCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get('customerId') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: Number(defaultCustomerId),
      vehicleId: 0,
      employeeId: '',
      problem: ''
    }
  });

  const customerId = watch('customerId');

  useEffect(() => {
    if (!customerId || Number.isNaN(customerId)) {
      setVehicles([]);
      return;
    }
    vehiclesApi.getByCustomerId(customerId).then(setVehicles).catch(() => setVehicles([]));
  }, [customerId]);

  const onSubmit = async (values: OrderFormValues) => {
    setSubmitError(null);
    try {
      const created = await ordersApi.create({
        customerId: values.customerId,
        vehicleId: values.vehicleId,
        employeeId: values.employeeId ? Number(values.employeeId) : null,
        problem: values.problem
      });
      navigate(`/orders/${created.id}`);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? 'Не удалось создать заказ.');
    }
  };

  return (
    <Stack spacing={3} alignItems="center">
      <Box width="100%" maxWidth={560}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Назад
        </Button>
      </Box>
      <Card sx={{ width: '100%', maxWidth: 560 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <div>
              <Typography variant="h5">Создание заказа</Typography>
              <Typography color="text.secondary">Базовая форма для ежедневного сценария приемки.</Typography>
            </div>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2.5}>
                <TextField label="Customer ID" error={Boolean(errors.customerId)} helperText={errors.customerId?.message} {...register('customerId')} />
                <TextField
                  select
                  label="Автомобиль"
                  error={Boolean(errors.vehicleId)}
                  helperText={errors.vehicleId?.message ?? (vehicles.length === 0 ? 'Сначала укажите клиента с автомобилями.' : '')}
                  defaultValue={0}
                  {...register('vehicleId')}
                >
                  <MenuItem value={0} disabled>
                    Выберите автомобиль
                  </MenuItem>
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} · {vehicle.licensePlate}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Employee ID (опционально)" error={Boolean(errors.employeeId)} helperText={errors.employeeId?.message} {...register('employeeId')} />
                <TextField label="Описание проблемы" multiline minRows={4} error={Boolean(errors.problem)} helperText={errors.problem?.message} {...register('problem')} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="text" onClick={() => navigate(-1)}>
                    Отмена
                  </Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Сохранить'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { vehiclesApi } from '../../api/vehiclesApi';

const schema = z.object({
  customerId: z.coerce.number().int().positive('Укажите customerId'),
  brand: z.string().min(1, 'Введите марку').max(25),
  model: z.string().min(1, 'Введите модель').max(25),
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN должен содержать 17 символов'),
  licensePlate: z.string().regex(/^[A-Z0-9-]{4,12}$/i, 'Введите корректный госномер')
});

type VehicleFormValues = z.infer<typeof schema>;

export const VehicleCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: Number(searchParams.get('customerId') ?? ''),
      brand: '',
      model: '',
      vin: '',
      licensePlate: ''
    }
  });

  const onSubmit = async (values: VehicleFormValues) => {
    setSubmitError(null);
    try {
      const created = await vehiclesApi.create(values);
      navigate(`/vehicles/${created.id}`);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? 'Не удалось создать автомобиль.');
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
              <Typography variant="h5">Создание автомобиля</Typography>
              <Typography color="text.secondary">Форма привязки автомобиля к клиенту.</Typography>
            </div>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2.5}>
                <TextField label="Customer ID" error={Boolean(errors.customerId)} helperText={errors.customerId?.message} {...register('customerId')} />
                <TextField label="Марка" error={Boolean(errors.brand)} helperText={errors.brand?.message} {...register('brand')} />
                <TextField label="Модель" error={Boolean(errors.model)} helperText={errors.model?.message} {...register('model')} />
                <TextField label="VIN" error={Boolean(errors.vin)} helperText={errors.vin?.message} {...register('vin')} />
                <TextField label="Госномер" error={Boolean(errors.licensePlate)} helperText={errors.licensePlate?.message} {...register('licensePlate')} />
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

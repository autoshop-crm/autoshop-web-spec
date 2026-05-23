import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { BookingDateAvailabilityItem, BookingSlotItem, customerBookingApi } from '../../api/customerBookingApi';
import { customersApi } from '../../api/customersApi';
import { ordersApi } from '../../api/ordersApi';
import { serviceCatalogApi } from '../../api/serviceCatalogApi';
import { vehiclesApi } from '../../api/vehiclesApi';
import { BookingAvailabilityCalendar } from '../../components/BookingAvailabilityCalendar';
import { CustomerLookupField } from '../../components/CustomerLookupField';
import { EmployeeAvailabilityLookupField } from '../../components/EmployeeAvailabilityLookupField';
import { Customer, EmployeeAvailabilitySearchItem, ServiceCatalogItemDTO, Vehicle } from '../../types/models';

const schema = z.object({
  customerId: z.coerce.number().int().positive('Выберите клиента'),
  vehicleId: z.coerce.number().int().positive('Укажите автомобиль'),
  employeeId: z.string().optional(),
  problem: z.string().min(5, 'Опишите проблему').max(1000),
  plannedVisitAt: z.string().optional(),
  plannedSlotMinutes: z.coerce.number().int().positive().optional().or(z.nan().transform(() => undefined)),
  bookingChannel: z.string().optional(),
  intakeNotes: z.string().max(2000, 'Слишком длинные заметки').optional(),
  immediateDropOff: z.boolean().default(false),
  requiresOwnerApprovalForEveryExtraWork: z.boolean().default(true),
  selectedServiceIds: z.array(z.number()).default([])
});

type OrderFormValues = z.input<typeof schema>;

const fullName = (customer: Customer) => `${customer.lastName} ${customer.firstName}`.trim();

const todayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatSlotLabel = (slot: BookingSlotItem) => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${formatter.format(new Date(slot.startAt))}–${formatter.format(new Date(slot.endAt))}`;
};

export const OrderCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get('customerId') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [serviceCatalogItems, setServiceCatalogItems] = useState<ServiceCatalogItemDTO[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAvailabilitySearchItem | null>(null);
  const [serviceCatalogError, setServiceCatalogError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<BookingDateAvailabilityItem[]>([]);
  const [daySlots, setDaySlots] = useState<BookingSlotItem[]>([]);
  const [plannedDate, setPlannedDate] = useState('');
  const [selectedSlotStartAt, setSelectedSlotStartAt] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: Number(defaultCustomerId),
      vehicleId: 0,
      employeeId: '',
      problem: '',
      plannedVisitAt: '',
      plannedSlotMinutes: 60,
      bookingChannel: 'WEB',
      intakeNotes: '',
      immediateDropOff: false,
      requiresOwnerApprovalForEveryExtraWork: true,
      selectedServiceIds: []
    }
  });

  const customerIdRegistration = register('customerId');
  const customerId = watch('customerId');
  const vehicleId = watch('vehicleId');
  const selectedServiceIds = watch('selectedServiceIds') ?? [];
  const immediateDropOff = watch('immediateDropOff');
  const plannedSlotMinutes = watch('plannedSlotMinutes');
  const plannedVisitAt = watch('plannedVisitAt');

  useEffect(() => {
    serviceCatalogApi.getServices({ activeOnly: true }).then((items) => {
      setServiceCatalogItems(items);
      setServiceCatalogError(null);
    }).catch((error: any) => {
      setServiceCatalogItems([]);
      setServiceCatalogError(error?.response?.data?.message ?? 'Не удалось загрузить стандартные услуги.');
    });
  }, []);

  useEffect(() => {
    if (!defaultCustomerId || Number.isNaN(Number(defaultCustomerId))) {
      return;
    }

    customersApi.getById(defaultCustomerId).then((customer) => {
      setSelectedCustomer(customer);
      setValue('customerId', customer.id, { shouldValidate: true, shouldDirty: false });
    }).catch(() => {
      setSelectedCustomer(null);
    });
  }, [defaultCustomerId, setValue]);

  useEffect(() => {
    if (!customerId || Number.isNaN(customerId)) {
      setVehicles([]);
      setValue('vehicleId', 0, { shouldValidate: false });
      return;
    }
    vehiclesApi.getByCustomerId(customerId).then((data) => {
      setVehicles(data);
      setValue('vehicleId', 0, { shouldValidate: false });
    }).catch(() => {
      setVehicles([]);
      setValue('vehicleId', 0, { shouldValidate: false });
    });
  }, [customerId, setValue]);

  useEffect(() => {
    setValue('plannedVisitAt', selectedSlotStartAt, { shouldDirty: true, shouldValidate: true });
    setSelectedEmployee(null);
    setValue('employeeId', '');
  }, [selectedSlotStartAt, setValue]);

  useEffect(() => {
    const canLoadAvailability = Number(vehicleId) > 0 && selectedServiceIds.length > 0;
    if (!canLoadAvailability) {
      setAvailableDates([]);
      setDaySlots([]);
      setPlannedDate('');
      setSelectedSlotStartAt('');
      setAvailabilityError(null);
      setSlotsError(null);
      return;
    }

    let active = true;
    setAvailabilityLoading(true);
    customerBookingApi.getAvailability({
      vehicleId: Number(vehicleId),
      serviceIds: selectedServiceIds,
      from: todayLocalDate(),
      days: 30
    }).then((data) => {
      if (!active) return;
      setAvailableDates(data);
      setAvailabilityError(null);

      const stillValid = plannedDate && data.some((item) => item.date === plannedDate && item.available);
      if (stillValid) return;

      const firstAvailableDate = data.find((item) => item.available)?.date ?? '';
      setPlannedDate(firstAvailableDate);
      setSelectedSlotStartAt('');
    }).catch((error: any) => {
      if (!active) return;
      setAvailableDates([]);
      setDaySlots([]);
      setPlannedDate('');
      setSelectedSlotStartAt('');
      setAvailabilityError(error?.response?.data?.message ?? 'Не удалось загрузить доступность дат.');
    }).finally(() => {
      if (active) {
        setAvailabilityLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [plannedDate, selectedServiceIds, setValue, vehicleId]);

  useEffect(() => {
    const canLoadSlots = Number(vehicleId) > 0 && selectedServiceIds.length > 0 && Boolean(plannedDate);
    if (!canLoadSlots) {
      setDaySlots([]);
      setSelectedSlotStartAt('');
      setSlotsError(null);
      return;
    }

    let active = true;
    setSlotsLoading(true);
    customerBookingApi.getSlots({
      vehicleId: Number(vehicleId),
      serviceIds: selectedServiceIds,
      date: plannedDate
    }).then((data) => {
      if (!active) return;
      setDaySlots(data);
      setSlotsError(null);

      const stillSelected = selectedSlotStartAt && data.some((slot) => slot.startAt === selectedSlotStartAt && slot.available);
      if (stillSelected) return;

      setSelectedSlotStartAt(data.find((slot) => slot.available)?.startAt ?? '');
    }).catch((error: any) => {
      if (!active) return;
      setDaySlots([]);
      setSelectedSlotStartAt('');
      setSlotsError(error?.response?.data?.message ?? 'Не удалось загрузить слоты на выбранную дату.');
    }).finally(() => {
      if (active) {
        setSlotsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [plannedDate, selectedServiceIds, selectedSlotStartAt, vehicleId]);

  const selectedServices = useMemo(
    () => serviceCatalogItems.filter((item) => selectedServiceIds.includes(item.id)),
    [serviceCatalogItems, selectedServiceIds]
  );

  const selectedSlot = useMemo(
    () => daySlots.find((slot) => slot.startAt === selectedSlotStartAt) ?? null,
    [daySlots, selectedSlotStartAt]
  );

  const onSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setValue('customerId', customer?.id ?? 0, { shouldValidate: true, shouldDirty: true });
  };

  const onToggleService = (serviceId: number, checked: boolean) => {
    const next = checked
      ? [...selectedServiceIds, serviceId]
      : selectedServiceIds.filter((id) => id !== serviceId);
    setValue('selectedServiceIds', next, { shouldDirty: true });
  };

  const onSubmit = async (values: OrderFormValues) => {
    setSubmitError(null);
    try {
      const payload = {
        customerId: values.customerId,
        vehicleId: values.vehicleId,
        employeeId: values.employeeId ? Number(values.employeeId) : null,
        problem: values.problem,
        plannedVisitAt: values.plannedVisitAt || null,
        plannedSlotMinutes: values.plannedSlotMinutes,
        bookingChannel: values.bookingChannel || null,
        intakeNotes: values.intakeNotes || null,
        selectedServiceIds,
        immediateDropOff,
        requiresOwnerApprovalForEveryExtraWork: values.requiresOwnerApprovalForEveryExtraWork
      };

      const order = immediateDropOff
        ? await ordersApi.createDropOff(payload)
        : await ordersApi.create(payload);

      navigate(`/orders/${order.id}`);
    } catch (requestError: any) {
      setSubmitError(requestError?.response?.data?.message ?? 'Не удалось создать заказ.');
    }
  };

  return (
    <Stack spacing={3}>
      <Button variant="text" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
        Назад
      </Button>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <div>
              <Typography variant="h4" gutterBottom>Новый заказ</Typography>
              <Typography color="text.secondary">Создай запись или сразу оформи drop-off, а затем передай заказ в работу по роли.</Typography>
            </div>

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Stack spacing={2.5}>
                  <Typography variant="h6">Клиент и автомобиль</Typography>
                  <CustomerLookupField value={selectedCustomer} onChange={onSelectCustomer} error={Boolean(errors.customerId)} helperText={errors.customerId?.message ?? 'Найди клиента по email или телефону'} />
                  <input type="hidden" {...customerIdRegistration} />
                  {selectedCustomer && (
                    <Alert severity="info">Выбран клиент: {fullName(selectedCustomer) || 'Без имени'} · {selectedCustomer.email} · {selectedCustomer.phoneNumber}</Alert>
                  )}
                  <TextField
                    select
                    label="Автомобиль"
                    error={Boolean(errors.vehicleId)}
                    helperText={errors.vehicleId?.message ?? 'Выбери автомобиль клиента'}
                    disabled={!selectedCustomer || vehicles.length === 0}
                    {...register('vehicleId', { valueAsNumber: true })}
                  >
                    <MenuItem value={0}>Не выбран</MenuItem>
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>{`${vehicle.brand} ${vehicle.model} · ${vehicle.licensePlate}`}</MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Divider />

                <Stack spacing={2.5}>
                  <Typography variant="h6">Дата и слот записи</Typography>
                  <TextField label="Что беспокоит клиента" multiline minRows={3} error={Boolean(errors.problem)} helperText={errors.problem?.message ?? 'Кратко опиши проблему или запрос клиента'} {...register('problem')} />
                  <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ width: '100%', maxWidth: 440 }}>
                      <BookingAvailabilityCalendar
                        availability={availableDates}
                        value={plannedDate}
                        onChange={(date) => {
                          setPlannedDate(date);
                          setSelectedSlotStartAt('');
                        }}
                        loading={availabilityLoading}
                        error={availabilityError}
                        disabled={!vehicleId || selectedServiceIds.length === 0}
                      />
                    </Box>
                    <Stack spacing={1.5} sx={{ flex: 1, width: '100%' }}>
                      <Typography variant="subtitle1">Время приезда</Typography>
                      {!plannedDate && <Alert severity="info">Выбери доступную дату в календаре, чтобы увидеть слоты.</Alert>}
                      {slotsLoading && <Alert severity="info">Загружаю слоты на выбранный день…</Alert>}
                      {slotsError && <Alert severity="warning">{slotsError}</Alert>}
                      {!slotsLoading && !slotsError && plannedDate && daySlots.length === 0 && (
                        <Alert severity="info">На выбранный день слоты не найдены.</Alert>
                      )}
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {daySlots.map((slot) => (
                          <Chip
                            key={slot.startAt}
                            label={`${formatSlotLabel(slot)} · ${slot.availableEmployeeCount}`}
                            color={slot.startAt === selectedSlotStartAt ? 'primary' : 'default'}
                            variant={slot.startAt === selectedSlotStartAt ? 'filled' : 'outlined'}
                            disabled={!slot.available}
                            onClick={() => setSelectedSlotStartAt(slot.startAt)}
                          />
                        ))}
                      </Stack>
                      {selectedSlot && (
                        <Alert severity="success">
                          Выбран слот: {formatSlotLabel(selectedSlot)} · доступных сотрудников: {selectedSlot.availableEmployeeCount}
                        </Alert>
                      )}
                    </Stack>
                    <TextField
                      fullWidth
                      type="number"
                      label="Длительность, минут"
                      error={Boolean(errors.plannedSlotMinutes)}
                      helperText={errors.plannedSlotMinutes?.message ?? 'Например: 30, 60, 90, 120'}
                      {...register('plannedSlotMinutes', { valueAsNumber: true })}
                    />
                  </Stack>
                  <input type="hidden" {...register('plannedVisitAt')} />
                  <TextField select label="Канал записи" error={Boolean(errors.bookingChannel)} helperText={errors.bookingChannel?.message ?? 'Только Web или Лично'} {...register('bookingChannel')}>
                    <MenuItem value="WEB">Web</MenuItem>
                    <MenuItem value="IN_PERSON">Лично</MenuItem>
                  </TextField>
                  <TextField label="Заметки приёмки" multiline minRows={3} error={Boolean(errors.intakeNotes)} helperText={errors.intakeNotes?.message ?? 'Что важно передать механику или менеджеру'} {...register('intakeNotes')} />
                </Stack>

                <Divider />

                <Stack spacing={2.5}>
                  <Typography variant="h6">Стандартные услуги</Typography>
                  {serviceCatalogError && <Alert severity="warning">{serviceCatalogError}</Alert>}
                  {serviceCatalogItems.length === 0 && !serviceCatalogError ? (
                    <Alert severity="info">Активные услуги пока не найдены.</Alert>
                  ) : (
                    <FormGroup>
                      {serviceCatalogItems.map((service) => (
                        <FormControlLabel
                          key={service.id}
                          control={<Checkbox checked={selectedServiceIds.includes(service.id)} onChange={(event) => onToggleService(service.id, event.target.checked)} />}
                          label={`${service.name}${service.basePrice ? ` · ${service.basePrice}` : ''}`}
                        />
                      ))}
                    </FormGroup>
                  )}
                  {selectedServices.length > 0 && (
                    <Alert severity="success">Выбрано услуг: {selectedServices.map((service) => service.name).join(', ')}</Alert>
                  )}
                </Stack>

                <Divider />

                <Stack spacing={2.5}>
                  <Typography variant="h6">Передача в работу</Typography>
                  <EmployeeAvailabilityLookupField
                    label="Сотрудник на выбранный слот (опционально)"
                    value={selectedEmployee}
                    onChange={(employee) => {
                      setSelectedEmployee(employee);
                      setValue('employeeId', employee ? String(employee.id) : '');
                    }}
                    plannedVisitAt={plannedVisitAt || null}
                    slotMinutes={plannedSlotMinutes ?? null}
                    roles={['MECHANIC']}
                    error={Boolean(errors.employeeId)}
                    helperText={errors.employeeId?.message ?? 'Показываются только механики, свободные на выбранное время.'}
                  />
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={immediateDropOff} onChange={(event) => setValue('immediateDropOff', event.target.checked, { shouldDirty: true })} />}
                      label="Клиент уже на месте — immediate drop-off / walk-in"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={watch('requiresOwnerApprovalForEveryExtraWork')} onChange={(event) => setValue('requiresOwnerApprovalForEveryExtraWork', event.target.checked, { shouldDirty: true })} />}
                      label="Каждая допработа требует отдельного согласования владельца"
                    />
                  </FormGroup>
                  <Alert severity="info">Как только автомобиль принят в работу, сотрудник считается занятым этой машиной на выбранный слот. При конфликте backend вернёт `409` и нужно будет выбрать другого сотрудника.</Alert>
                </Stack>

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="text" onClick={() => navigate(-1)}>Отмена</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={22} color="inherit" /> : immediateDropOff ? 'Создать drop-off заказ' : 'Создать запись'}
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

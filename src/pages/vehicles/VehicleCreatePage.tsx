import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { customersApi } from '../../api/customersApi';
import { partsApi } from '../../api/partsApi';
import { VehicleCatalogLinkPayload, VehicleCreatePayload, vehiclesApi } from '../../api/vehiclesApi';
import { CustomerLookupField } from '../../components/CustomerLookupField';
import { CatalogManufacturer, CatalogModelSeries, CatalogModification, Customer } from '../../types/models';
import { getBrandCatalogItem, vehicleBrandCatalog, VehicleBrandCatalogItem } from '../../utils/vehicleCatalog';

const schema = z.object({
  customerId: z.coerce.number().int().positive('Выберите клиента'),
  brand: z.string().min(1, 'Введите марку').max(25),
  model: z.string().min(1, 'Введите модель').max(25),
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN должен содержать 17 символов'),
  licensePlate: z.string().regex(/^[A-Z0-9-]{4,12}$/i, 'Введите корректный госномер')
});

type VehicleFormValues = z.infer<typeof schema>;

const fullName = (customer: Customer) => `${customer.lastName} ${customer.firstName}`.trim();
const catalogType = 'PC';

const BrandLogo = ({ option }: { option: VehicleBrandCatalogItem }) => {
  const [logoError, setLogoError] = useState(false);
  const initials = option.brand.slice(0, 2).toUpperCase();

  if (!option.logoUrl || logoError) {
    return <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{initials}</Avatar>;
  }

  return (
    <Avatar sx={{ width: 28, height: 28, bgcolor: 'transparent' }}>
      <Box component="img" src={option.logoUrl} alt={`Логотип ${option.brand}`} onError={() => setLogoError(true)} sx={{ width: 24, height: 24, objectFit: 'contain' }} />
    </Avatar>
  );
};

export const VehicleCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get('customerId') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manufacturers, setManufacturers] = useState<CatalogManufacturer[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [modelSeriesOptions, setModelSeriesOptions] = useState<CatalogModelSeries[]>([]);
  const [modelSeriesLoading, setModelSeriesLoading] = useState(false);
  const [modificationOptions, setModificationOptions] = useState<CatalogModification[]>([]);
  const [modificationLoading, setModificationLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<CatalogManufacturer | null>(null);
  const [selectedModelSeries, setSelectedModelSeries] = useState<CatalogModelSeries | null>(null);
  const [selectedModification, setSelectedModification] = useState<CatalogModification | null>(null);
  const [catalogTouched, setCatalogTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: Number(defaultCustomerId),
      brand: '',
      model: '',
      vin: '',
      licensePlate: ''
    }
  });

  const customerIdRegistration = register('customerId');
  const brandRegistration = register('brand');
  const modelRegistration = register('model');
  const brandValue = watch('brand');
  const modelValue = watch('model');

  useEffect(() => {
    const loadManufacturers = async () => {
      setManufacturersLoading(true);
      setCatalogError(null);
      try {
        const popularItems = await partsApi.getManufacturers({ type: catalogType, popular: true });
        if (popularItems.length > 0) {
          setManufacturers(popularItems);
          return;
        }

        const allItems = await partsApi.getManufacturers({ type: catalogType });
        setManufacturers(allItems);
      } catch (requestError: any) {
        setCatalogError(requestError?.response?.data?.message ?? 'Не удалось загрузить производителей каталога.');
        setManufacturers([]);
      } finally {
        setManufacturersLoading(false);
      }
    };

    void loadManufacturers();
  }, []);

  useEffect(() => {
    if (!defaultCustomerId || Number.isNaN(Number(defaultCustomerId))) return;
    customersApi.getById(defaultCustomerId).then((customer) => {
      setSelectedCustomer(customer);
      setValue('customerId', customer.id, { shouldValidate: true, shouldDirty: false });
    }).catch(() => {
      setSelectedCustomer(null);
    });
  }, [defaultCustomerId, setValue]);

  useEffect(() => {
    if (!brandValue || manufacturers.length === 0 || selectedManufacturer) return;
    const normalized = brandValue.trim().toLowerCase();
    const exact = manufacturers.find((item) => item.name.trim().toLowerCase() === normalized);
    if (exact) {
      void handleManufacturerSelect(exact, false);
    }
  }, [brandValue, manufacturers]);

  useEffect(() => {
    if (!modelValue || modelSeriesOptions.length === 0 || selectedModelSeries) return;
    const normalized = modelValue.trim().toLowerCase();
    const exact = modelSeriesOptions.find((item) => item.name.trim().toLowerCase() === normalized);
    if (exact) {
      void handleModelSeriesSelect(exact, false);
    }
  }, [modelValue, modelSeriesOptions]);

  const onSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setValue('customerId', customer?.id ?? 0, { shouldValidate: true, shouldDirty: true });
  };

  const selectedBrand = useMemo(() => getBrandCatalogItem(brandValue), [brandValue]);
  const modelOptions = selectedBrand?.models ?? [];

  const resetSeriesAndModification = () => {
    setSelectedModelSeries(null);
    setSelectedModification(null);
    setModelSeriesOptions([]);
    setModificationOptions([]);
  };

  const resetModification = () => {
    setSelectedModification(null);
    setModificationOptions([]);
  };

  const handleManufacturerSelect = async (nextManufacturer: CatalogManufacturer | null, markTouched = true) => {
    setSelectedManufacturer(nextManufacturer);
    resetSeriesAndModification();
    if (markTouched) setCatalogTouched(true);
    if (!nextManufacturer) return;
    setModelSeriesLoading(true);
    setCatalogError(null);
    try {
      const data = await partsApi.getModelSeries({ type: catalogType, manufacturerId: nextManufacturer.manufacturerId });
      setModelSeriesOptions(data);
    } catch (requestError: any) {
      setCatalogError(requestError?.response?.data?.message ?? 'Не удалось загрузить серии/модели каталога.');
    } finally {
      setModelSeriesLoading(false);
    }
  };

  const handleModelSeriesSelect = async (nextSeries: CatalogModelSeries | null, markTouched = true) => {
    setSelectedModelSeries(nextSeries);
    resetModification();
    if (markTouched) setCatalogTouched(true);
    if (!nextSeries) return;
    setModificationLoading(true);
    setCatalogError(null);
    try {
      const data = await partsApi.getModifications({ type: catalogType, modelSeriesId: nextSeries.modelSeriesId });
      setModificationOptions(data);
    } catch (requestError: any) {
      setCatalogError(requestError?.response?.data?.message ?? 'Не удалось загрузить модификации каталога.');
    } finally {
      setModificationLoading(false);
    }
  };

  const handleBrandChange = (_event: SyntheticEvent, nextValue: VehicleBrandCatalogItem | string | null) => {
    const nextBrand = typeof nextValue === 'string' ? nextValue : nextValue?.brand ?? '';
    setValue('brand', nextBrand, { shouldValidate: true, shouldDirty: true });
    setValue('model', '', { shouldValidate: true, shouldDirty: true });
    setSelectedManufacturer(null);
    resetSeriesAndModification();
    setCatalogTouched(false);
  };

  const handleModelChange = (_event: SyntheticEvent, nextValue: string | null) => {
    setValue('model', nextValue ?? '', { shouldValidate: true, shouldDirty: true });
    setSelectedModelSeries(null);
    resetModification();
    setCatalogTouched(false);
  };

  const buildCatalogPayload = (): VehicleCatalogLinkPayload | null => {
    if (!selectedManufacturer || !selectedModelSeries || !selectedModification) return null;
    return {
      type: catalogType,
      manufacturerId: selectedManufacturer.manufacturerId,
      manufacturerName: selectedManufacturer.name,
      modelSeriesId: selectedModelSeries.modelSeriesId,
      modelSeriesName: selectedModelSeries.name,
      modificationId: selectedModification.modificationId,
      modificationName: selectedModification.name,
      engineDescription: selectedModification.displayName ?? selectedModification.engineType ?? undefined
    };
  };

  const onSubmit = async (values: VehicleFormValues) => {
    setSubmitError(null);
    try {
      const created = await vehiclesApi.create(values as VehicleCreatePayload);
      const catalogPayload = buildCatalogPayload();
      if (catalogPayload) {
        await vehiclesApi.linkCatalog(created.id, catalogPayload);
      }
      navigate(`/vehicles/${created.id}`);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? 'Не удалось создать автомобиль.');
    }
  };

  const catalogSummary = selectedManufacturer && selectedModelSeries && selectedModification;

  return (
    <Stack spacing={3} alignItems="center">
      <Box width="100%" maxWidth={720}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Назад
        </Button>
      </Box>
      <Card sx={{ width: '100%', maxWidth: 720 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" gutterBottom>Добавить автомобиль</Typography>
              <Typography color="text.secondary">Создание машины и привязка к каталогу UMAPI в одном wizard-flow.</Typography>
            </Box>

            {submitError && <Alert severity="error">{submitError}</Alert>}
            {catalogError && <Alert severity="warning">{catalogError}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)}>
              <input type="hidden" {...customerIdRegistration} />
              <input type="hidden" {...brandRegistration} />
              <input type="hidden" {...modelRegistration} />
              <Stack spacing={3}>
                <CustomerLookupField
                  value={selectedCustomer}
                  onChange={onSelectCustomer}
                  error={Boolean(errors.customerId)}
                  helperText={errors.customerId?.message ?? 'Пример: найдите клиента по email `ivan@mail.ru` или телефону `89616521391`'}
                  createCustomerPath="/customers?create=1"
                />
                {selectedCustomer && <Alert severity="info">Выбран клиент: {fullName(selectedCustomer) || 'Без имени'} · {selectedCustomer.email} · {selectedCustomer.phoneNumber}</Alert>}

                <Stack spacing={2.5}>
                  <Typography variant="h6">Основные данные автомобиля</Typography>
                  <Autocomplete<VehicleBrandCatalogItem, false, false, false>
                    options={vehicleBrandCatalog}
                    value={selectedBrand ?? null}
                    onChange={handleBrandChange}
                    inputValue={brandValue}
                    onInputChange={(_event, nextValue, reason) => {
                      if (reason === 'input') setValue('brand', nextValue, { shouldValidate: true, shouldDirty: true });
                      if (reason === 'clear') {
                        setValue('brand', '', { shouldValidate: true, shouldDirty: true });
                        setValue('model', '', { shouldValidate: true, shouldDirty: true });
                        setSelectedManufacturer(null);
                        resetSeriesAndModification();
                        setCatalogTouched(false);
                      }
                    }}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.brand}
                    isOptionEqualToValue={(option, value) => option.brand === (typeof value === 'string' ? value : value.brand)}
                    renderInput={(params) => <TextField {...params} label="Марка" error={Boolean(errors.brand)} helperText={errors.brand?.message ?? 'Пример: `Toyota`, `BMW`, `LADA`'} />}
                    renderOption={(props, option) => {
                      if (typeof option === 'string') return null;
                      const { key, ...optionProps } = props;
                      return (
                        <Box component="li" key={key} {...optionProps}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <BrandLogo option={option} />
                            <Typography>{option.brand}</Typography>
                          </Stack>
                        </Box>
                      );
                    }}
                  />
                  <Autocomplete<string, false, false, true>
                    freeSolo
                    options={modelOptions}
                    value={modelValue || null}
                    onChange={handleModelChange}
                    inputValue={modelValue}
                    onInputChange={(_event, nextValue, reason) => {
                      if (reason === 'input') setValue('model', nextValue, { shouldValidate: true, shouldDirty: true });
                      if (reason === 'clear') {
                        setValue('model', '', { shouldValidate: true, shouldDirty: true });
                        setSelectedModelSeries(null);
                        resetModification();
                        setCatalogTouched(false);
                      }
                    }}
                    disabled={!brandValue}
                    renderInput={(params) => <TextField {...params} label="Модель" error={Boolean(errors.model)} helperText={errors.model?.message ?? (brandValue ? 'Пример: `Camry`, `X5`, `Vesta`' : 'Сначала выберите марку')} />}
                  />
                  <TextField label="VIN" error={Boolean(errors.vin)} helperText={errors.vin?.message ?? 'Пример: `XTA217130Y0000001` или `WVWZZZ1JZXW000001`'} {...register('vin')} />
                  <TextField label="Госномер" error={Boolean(errors.licensePlate)} helperText={errors.licensePlate?.message ?? 'Пример: `A123BC777`, `М456ОР78`, `T123TT99` без пробелов'} {...register('licensePlate')} />
                </Stack>

                <Divider />

                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <LinkRoundedIcon color="primary" />
                    <Typography variant="h6">Каталог UMAPI</Typography>
                  </Stack>
                  <Alert severity="info" icon={<SearchRoundedIcon fontSize="inherit" />}>
                    Подбери точную модификацию автомобиля. Без этого поиск деталей по названию в заказе будет недоступен.
                  </Alert>

                  <Autocomplete<CatalogManufacturer, false, false, false>
                    options={manufacturers}
                    loading={manufacturersLoading}
                    value={selectedManufacturer}
                    onChange={(_event, nextValue) => void handleManufacturerSelect(nextValue)}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.manufacturerId === value.manufacturerId}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Производитель"
                        helperText="Шаг 1. Выбери бренд из каталога"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {manufacturersLoading ? <CircularProgress color="inherit" size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />

                  <Autocomplete<CatalogModelSeries, false, false, false>
                    options={modelSeriesOptions}
                    loading={modelSeriesLoading}
                    value={selectedModelSeries}
                    onChange={(_event, nextValue) => void handleModelSeriesSelect(nextValue)}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.modelSeriesId === value.modelSeriesId}
                    disabled={!selectedManufacturer}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Серия / модель"
                        helperText={!selectedManufacturer ? 'Сначала выбери производителя' : 'Шаг 2. Выбери серию для выбранного производителя'}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {modelSeriesLoading ? <CircularProgress color="inherit" size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />

                  <Autocomplete<CatalogModification, false, false, false>
                    options={modificationOptions}
                    loading={modificationLoading}
                    value={selectedModification}
                    onChange={(_event, nextValue) => {
                      setSelectedModification(nextValue);
                      setCatalogTouched(true);
                    }}
                    getOptionLabel={(option) => option.displayName ?? option.name}
                    isOptionEqualToValue={(option, value) => option.modificationId === value.modificationId}
                    disabled={!selectedModelSeries}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Точная модификация"
                        helperText={!selectedModelSeries ? 'Сначала выбери серию / модель' : 'Шаг 3. Подтверди точную модификацию'}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {modificationLoading ? <CircularProgress color="inherit" size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />

                  {catalogSummary && (
                    <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="inherit" />}>
                      <Stack spacing={0.5}>
                        <Typography>Производитель: {selectedManufacturer.name}</Typography>
                        <Typography>Серия: {selectedModelSeries.name}</Typography>
                        <Typography>Модификация: {selectedModification.displayName ?? selectedModification.name}</Typography>
                        {(selectedModification.engineType || selectedModification.fuelType || selectedModification.capacityLiters) && (
                          <Typography>
                            Двигатель: {selectedModification.displayName ?? [selectedModification.capacityLiters ? `${selectedModification.capacityLiters}L` : null, selectedModification.fuelType ?? selectedModification.engineType ?? null].filter(Boolean).join(', ')}
                          </Typography>
                        )}
                      </Stack>
                    </Alert>
                  )}

                  {!catalogSummary && catalogTouched && (
                    <Alert severity="warning" icon={<WarningAmberRoundedIcon fontSize="inherit" />}>
                      Машина может быть сохранена без точной модификации, но поиск деталей по названию в заказе будет недоступен, пока каталог не привязан.
                    </Alert>
                  )}
                </Stack>

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="text" onClick={() => navigate(-1)}>Отмена</Button>
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

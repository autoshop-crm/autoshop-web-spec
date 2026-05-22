import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customersApi';
import { partsApi } from '../../api/partsApi';
import { VehicleCatalogLinkPayload, VehicleUpdatePayload, vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { DetailGrid } from '../../components/DetailGrid';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, CatalogManufacturer, CatalogModelSeries, CatalogModification, Customer, Vehicle } from '../../types/models';
import { formatDateTime, fullName } from '../../utils/format';
import { hasAnyRole } from '../../utils/roles';
import { getBrandCatalogItem, VehicleBrandCatalogItem, vehicleBrandCatalog } from '../../utils/vehicleCatalog';

const catalogType = 'PC';

export const VehicleDetailsPage = ({ currentUser }: { currentUser?: AuthUser | null }) => {
  const navigate = useNavigate();
  const { vehicleId = '' } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

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

  const canEditVehicle = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  const selectedBrand = useMemo(() => getBrandCatalogItem(brand), [brand]);
  const modelOptions = selectedBrand?.models ?? [];

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const vehicleData = await vehiclesApi.getById(vehicleId);
      setVehicle(vehicleData);
      setBrand(vehicleData.brand);
      setModel(vehicleData.model);
      setVin(vehicleData.vin);
      setLicensePlate(vehicleData.licensePlate);
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

  useEffect(() => {
    const loadManufacturers = async () => {
      setManufacturersLoading(true);
      try {
        const data = await partsApi.getManufacturers({ type: catalogType, popular: true });
        setManufacturers(data);
      } catch {
      } finally {
        setManufacturersLoading(false);
      }
    };
    void loadManufacturers();
  }, []);

  useEffect(() => {
    if (!brand || manufacturers.length === 0 || selectedManufacturer) return;
    const exact = manufacturers.find((item) => item.name.trim().toLowerCase() === brand.trim().toLowerCase());
    if (exact) void handleManufacturerSelect(exact, false);
  }, [brand, manufacturers]);

  useEffect(() => {
    if (!model || modelSeriesOptions.length === 0 || selectedModelSeries) return;
    const exact = modelSeriesOptions.find((item) => item.name.trim().toLowerCase() === model.trim().toLowerCase());
    if (exact) void handleModelSeriesSelect(exact, false);
  }, [model, modelSeriesOptions]);

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

  const openEdit = () => {
    if (!vehicle) return;
    setActionError(null);
    setCatalogError(null);
    setEditOpen(true);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setVin(vehicle.vin);
    setLicensePlate(vehicle.licensePlate);
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

  const submitEdit = async () => {
    if (!vehicle) return;
    setSaving(true);
    setActionError(null);
    try {
      const payload: VehicleUpdatePayload = { brand, model, vin, licensePlate };
      await vehiclesApi.update(vehicle.id, payload);
      const catalogPayload = buildCatalogPayload();
      if (catalogPayload) {
        await vehiclesApi.linkCatalog(vehicle.id, catalogPayload);
      }
      await loadPage();
      setEditOpen(false);
    } catch (requestError: any) {
      setActionError(requestError?.response?.data?.message ?? 'Не удалось обновить автомобиль.');
    } finally {
      setSaving(false);
    }
  };

  const unlinkCatalog = async () => {
    if (!vehicle) return;
    setActionError(null);
    try {
      await vehiclesApi.unlinkCatalog(vehicle.id);
      await loadPage();
    } catch (requestError: any) {
      setActionError(requestError?.response?.data?.message ?? 'Не удалось сбросить привязку каталога.');
    }
  };

  const catalogSummary = selectedManufacturer && selectedModelSeries && selectedModification;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>Назад</Button>
        <Typography variant="h4">{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Карточка автомобиля'}</Typography>
        {vehicle?.umapiCatalogLinkedAt ? <Chip color="success" icon={<CheckCircleRoundedIcon />} label="Каталог привязан" /> : <Chip color="warning" icon={<WarningAmberRoundedIcon />} label="Каталог не привязан" />}
      </Stack>

      {error && <AppAlert message={error} onRetry={() => void loadPage()} />}
      {actionError && <Alert severity="error">{actionError}</Alert>}
      {loading && <LoadingTable />}
      {!loading && !error && vehicle && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard title="Основная информация" action={canEditVehicle ? <Button startIcon={<EditRoundedIcon />} variant="outlined" onClick={openEdit}>Редактировать</Button> : undefined}>
              <DetailGrid
                items={[
                  { label: 'ID', value: vehicle.id },
                  { label: 'Клиент', value: customer ? fullName(customer.firstName, customer.lastName) : vehicle.customerId },
                  { label: 'VIN', value: vehicle.vin },
                  { label: 'Госномер', value: vehicle.licensePlate },
                  { label: 'Марка', value: vehicle.brand },
                  { label: 'Модель', value: vehicle.model },
                  { label: 'UMAPI Производитель', value: vehicle.umapiManufacturerName ?? '—' },
                  { label: 'UMAPI Серия', value: vehicle.umapiModelSeriesName ?? '—' },
                  { label: 'UMAPI Модификация', value: vehicle.umapiModificationName ?? '—' },
                  { label: 'Двигатель', value: vehicle.umapiEngineDescription ?? '—' },
                  { label: 'Создан', value: formatDateTime(vehicle.createdAt) },
                  { label: 'Обновлен', value: formatDateTime(vehicle.updatedAt) }
                ]}
              />
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard title="Связанные данные">
              <Stack spacing={2}>
                <Button component={Link} to={`/customers/${vehicle.customerId}`} variant="outlined">Открыть клиента</Button>
                {vehicle.umapiCatalogLinkedAt ? (
                  <>
                    <Typography color="text.secondary">Каталог UMAPI привязан: {formatDateTime(vehicle.umapiCatalogLinkedAt)}</Typography>
                    {canEditVehicle && <Button color="warning" startIcon={<LinkOffRoundedIcon />} onClick={() => void unlinkCatalog()}>Сбросить привязку</Button>}
                  </>
                ) : (
                  <Alert severity="warning">Для этой машины не выбрана точная модификация каталога.</Alert>
                )}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Редактирование автомобиля</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {catalogError && <Alert severity="warning">{catalogError}</Alert>}
            <TextField label="Марка" value={brand} onChange={(event) => { setBrand(event.target.value); setSelectedManufacturer(null); resetSeriesAndModification(); setCatalogTouched(false); }} />
            <Autocomplete<string, false, false, true>
              freeSolo
              options={modelOptions}
              value={model || null}
              onChange={(_event, nextValue) => { setModel(nextValue ?? ''); setSelectedModelSeries(null); resetModification(); setCatalogTouched(false); }}
              inputValue={model}
              onInputChange={(_event, nextValue) => { setModel(nextValue); setSelectedModelSeries(null); resetModification(); setCatalogTouched(false); }}
              renderInput={(params) => <TextField {...params} label="Модель" />}
            />
            <TextField label="VIN" value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} />
            <TextField label="Госномер" value={licensePlate} onChange={(event) => setLicensePlate(event.target.value.toUpperCase())} />

            <Alert severity="info" icon={<SearchRoundedIcon fontSize="inherit" />}>Заполни UMAPI-привязку каскадно: производитель → серия → модификация.</Alert>

            <Autocomplete<CatalogManufacturer, false, false, false>
              options={manufacturers}
              loading={manufacturersLoading}
              value={selectedManufacturer}
              onChange={(_event, nextValue) => void handleManufacturerSelect(nextValue)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.manufacturerId === value.manufacturerId}
              renderInput={(params) => <TextField {...params} label="Производитель" />}
            />
            <Autocomplete<CatalogModelSeries, false, false, false>
              options={modelSeriesOptions}
              loading={modelSeriesLoading}
              value={selectedModelSeries}
              onChange={(_event, nextValue) => void handleModelSeriesSelect(nextValue)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.modelSeriesId === value.modelSeriesId}
              disabled={!selectedManufacturer}
              renderInput={(params) => <TextField {...params} label="Серия / модель" helperText={!selectedManufacturer ? 'Сначала выбери производителя' : undefined} />}
            />
            <Autocomplete<CatalogModification, false, false, false>
              options={modificationOptions}
              loading={modificationLoading}
              value={selectedModification}
              onChange={(_event, nextValue) => { setSelectedModification(nextValue); setCatalogTouched(true); }}
              getOptionLabel={(option) => option.displayName ?? option.name}
              isOptionEqualToValue={(option, value) => option.modificationId === value.modificationId}
              disabled={!selectedModelSeries}
              renderInput={(params) => <TextField {...params} label="Точная модификация" helperText={!selectedModelSeries ? 'Сначала выбери серию / модель' : undefined} />}
            />

            {catalogSummary && (
              <Alert severity="success" icon={<LinkRoundedIcon fontSize="inherit" />}>
                <Stack spacing={0.5}>
                  <Typography>Производитель: {selectedManufacturer.name}</Typography>
                  <Typography>Серия: {selectedModelSeries.name}</Typography>
                  <Typography>Модификация: {selectedModification.displayName ?? selectedModification.name}</Typography>
                </Stack>
              </Alert>
            )}
            {!catalogSummary && catalogTouched && <Alert severity="warning">Машину можно сохранить и без новой привязки каталога, но поиск деталей по названию без неё не заработает.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => void submitEdit()} disabled={saving || !brand || !model || !vin || !licensePlate}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

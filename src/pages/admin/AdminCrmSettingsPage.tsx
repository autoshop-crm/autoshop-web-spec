import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { crmLoyaltySettingsApi } from '../../api/crmLoyaltySettingsApi';
import { serviceCatalogApi } from '../../api/serviceCatalogApi';
import { AppAlert } from '../../components/AppAlert';
import { AccessDeniedState } from '../../components/AccessDeniedState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, LoyaltySettingsDTO, ServiceCatalogCategoryDTO, ServiceCatalogItemCreateDTO, ServiceCatalogItemDTO } from '../../types/models';
import { formatDateTime, formatMoney } from '../../utils/format';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { hasAnyRole } from '../../utils/roles';

interface ServiceDraft {
  id?: number;
  categoryId: string;
  name: string;
  description: string;
  basePrice: string;
  active: boolean;
  defaultDurationMinutes: string;
  inspectionItemsText: string;
}

const emptyServiceDraft: ServiceDraft = {
  categoryId: '',
  name: '',
  description: '',
  basePrice: '',
  active: true,
  defaultDurationMinutes: '',
  inspectionItemsText: ''
};

const serviceCatalogAccessMessage = 'Backend сейчас отвечает 403 на `/api/service-catalog/**`. Это ограничение security-конфига backend, а не ошибка формы.';

const normalizeInspectionItems = (value: string) => {
  const items = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
};

const buildServicePayload = (draft: ServiceDraft): ServiceCatalogItemCreateDTO => {
  const trimmedName = draft.name.trim();
  const trimmedDescription = draft.description.trim();
  const basePrice = Number(draft.basePrice);
  const defaultDurationMinutes = draft.defaultDurationMinutes.trim() ? Number(draft.defaultDurationMinutes) : null;

  return {
    name: trimmedName,
    description: trimmedDescription || undefined,
    basePrice,
    categoryId: draft.categoryId ? Number(draft.categoryId) : null,
    active: draft.active,
    defaultDurationMinutes,
    inspectionItems: normalizeInspectionItems(draft.inspectionItemsText)
  };
};

export const AdminCrmSettingsPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const canManage = hasAnyRole(currentUser?.roles, ['ADMIN']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettingsDTO | null>(null);
  const [categories, setCategories] = useState<ServiceCatalogCategoryDTO[]>([]);
  const [services, setServices] = useState<ServiceCatalogItemDTO[]>([]);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState('');
  const [categoryActive, setCategoryActive] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft);

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category])), [categories]);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    setLoyaltyError(null);
    setCatalogError(null);

    const [loyaltyResult, categoriesResult, servicesResult] = await Promise.allSettled([
      crmLoyaltySettingsApi.getSettings(),
      serviceCatalogApi.getCategories({ activeOnly: false }),
      serviceCatalogApi.getServices({ activeOnly: false })
    ]);

    if (loyaltyResult.status === 'fulfilled') {
      setLoyaltySettings(loyaltyResult.value);
    } else {
      setLoyaltySettings(null);
      setLoyaltyError(getApiErrorMessage(loyaltyResult.reason, 'Не удалось загрузить настройки программы лояльности.'));
    }

    const categoryFailure = categoriesResult.status === 'rejected' ? categoriesResult.reason : null;
    const serviceFailure = servicesResult.status === 'rejected' ? servicesResult.reason : null;

    setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);
    setServices(servicesResult.status === 'fulfilled' ? servicesResult.value : []);

    if (categoryFailure || serviceFailure) {
      const reason = categoryFailure ?? serviceFailure;
      const status = reason?.response?.status;
      setCatalogError(status === 403 ? serviceCatalogAccessMessage : getApiErrorMessage(reason, 'Не удалось загрузить каталог услуг.'));
    }

    if (loyaltyResult.status === 'rejected' && categoryFailure && serviceFailure) {
      setError('Не удалось загрузить ни настройки лояльности, ни каталог услуг. Проверь backend endpoints и security rules.');
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadPage();
  }, []);

  const resetMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const openCreateServiceDialog = () => {
    resetMessages();
    setServiceDraft(emptyServiceDraft);
    setServiceDialogOpen(true);
  };

  const openEditServiceDialog = (service: ServiceCatalogItemDTO) => {
    resetMessages();
    setServiceDraft({
      id: service.id,
      categoryId: service.categoryId ? String(service.categoryId) : '',
      name: service.name,
      description: service.description ?? '',
      basePrice: service.basePrice != null ? String(service.basePrice) : '',
      active: service.active ?? true,
      defaultDurationMinutes: service.defaultDurationMinutes != null ? String(service.defaultDurationMinutes) : '',
      inspectionItemsText: (service.inspectionItems ?? []).join('\n')
    });
    setServiceDialogOpen(true);
  };

  const submitCategory = async () => {
    if (!categoryName.trim()) {
      setActionError('Укажи название категории.');
      return;
    }

    setSaving(true);
    resetMessages();
    try {
      await serviceCatalogApi.createCategory({
        name: categoryName.trim(),
        displayOrder: categoryDisplayOrder.trim() ? Number(categoryDisplayOrder) : null,
        active: categoryActive
      });
      setCategoryName('');
      setCategoryDisplayOrder('');
      setCategoryActive(true);
      setActionSuccess('Группа услуг создана.');
      await loadPage();
    } catch (requestError: any) {
      setActionError(
        requestError?.response?.status === 403
          ? serviceCatalogAccessMessage
          : getApiErrorMessage(requestError, 'Не удалось создать группу услуг.', {
              badRequest: 'Проверь название и порядок отображения группы услуг.',
              conflict: 'Группа услуг с таким названием уже существует.'
            })
      );
    } finally {
      setSaving(false);
    }
  };

  const submitService = async () => {
    const trimmedName = serviceDraft.name.trim();
    const parsedBasePrice = Number(serviceDraft.basePrice);

    if (!trimmedName) {
      setActionError('Укажи название услуги.');
      return;
    }

    if (serviceDraft.basePrice.trim() === '' || Number.isNaN(parsedBasePrice) || parsedBasePrice < 0) {
      setActionError('Укажи корректную базовую цену услуги.');
      return;
    }

    if (serviceDraft.defaultDurationMinutes.trim() !== '' && (Number.isNaN(Number(serviceDraft.defaultDurationMinutes)) || Number(serviceDraft.defaultDurationMinutes) < 0)) {
      setActionError('Длительность должна быть пустой или неотрицательным числом минут.');
      return;
    }

    setSaving(true);
    resetMessages();
    try {
      const payload = buildServicePayload(serviceDraft);

      if (serviceDraft.id) {
        await serviceCatalogApi.updateService(serviceDraft.id, payload);
        setActionSuccess('Услуга обновлена.');
      } else {
        await serviceCatalogApi.createService(payload);
        setActionSuccess('Услуга создана.');
      }

      setServiceDialogOpen(false);
      setServiceDraft(emptyServiceDraft);
      await loadPage();
    } catch (requestError: any) {
      setActionError(
        requestError?.response?.status === 403
          ? serviceCatalogAccessMessage
          : getApiErrorMessage(requestError, 'Не удалось сохранить услугу.', {
              badRequest: 'Проверь name, basePrice, categoryId, defaultDurationMinutes и inspectionItems.',
              conflict: 'Услуга конфликтует с текущим состоянием каталога. Обнови список и попробуй снова.'
            })
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <AccessDeniedState description="Раздел CRM-настроек доступен только администраторам." />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <SettingsRoundedIcon color="primary" />
        <div>
          <Typography variant="h4">CRM-настройки</Typography>
          <Typography color="text.secondary">Управление каталогом услуг и текущим состоянием программы лояльности для роли ADMIN.</Typography>
        </div>
      </Stack>

      {error && <AppAlert message={error} onRetry={() => void loadPage()} />}
      {actionError && <Alert severity="error">{actionError}</Alert>}
      {actionSuccess && <Alert severity="success">{actionSuccess}</Alert>}
      {loading && <LoadingTable />}

      {!loading && (
        <>
          <SectionCard title="Loyalty settings">
            {loyaltyError && <Alert severity="warning" sx={{ mb: 2 }}>{loyaltyError}</Alert>}
            {loyaltySettings ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={loyaltySettings.enabled ? 'Loyalty включена' : 'Loyalty выключена'} color={loyaltySettings.enabled ? 'success' : 'default'} />
                  <Chip label={loyaltySettings.visible ? 'Видима в интерфейсах staff/client' : 'Скрыта из интерфейсов'} variant="outlined" />
                  <Chip label={loyaltySettings.spendEnabled ? 'Списание разрешено' : 'Списание выключено'} variant="outlined" />
                  <Chip label={loyaltySettings.earnEnabled ? 'Начисление включено' : 'Начисление выключено'} variant="outlined" />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <Typography variant="body2">Баллы за единицу валюты: {loyaltySettings.pointsPerCurrencyUnit ?? '—'}</Typography>
                  <Typography variant="body2">Единиц валюты за балл: {loyaltySettings.currencyUnitsPerPoint ?? '—'}</Typography>
                  <Typography variant="body2">Обновлено: {formatDateTime(loyaltySettings.updatedAt)}</Typography>
                </Stack>
                <Alert severity="info">
                  Backend currently exposes only `GET /api/loyalty/settings`, поэтому здесь доступен только read-only обзор текущего состояния программы лояльности.
                </Alert>
              </Stack>
            ) : !loyaltyError ? (
              <Alert severity="warning">Loyalty settings сейчас недоступны.</Alert>
            ) : null}
          </SectionCard>

          <SectionCard title="Группы услуг">
            {catalogError && <Alert severity="warning" sx={{ mb: 2 }}>{catalogError}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
              <TextField fullWidth label="Название группы" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} disabled={Boolean(catalogError) || saving} />
              <TextField fullWidth label="Порядок отображения" value={categoryDisplayOrder} onChange={(event) => setCategoryDisplayOrder(event.target.value)} disabled={Boolean(catalogError) || saving} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 220 }}>
                <Switch checked={categoryActive} onChange={(event) => setCategoryActive(event.target.checked)} disabled={Boolean(catalogError) || saving} />
                <Typography>{categoryActive ? 'Группа активна' : 'Группа неактивна'}</Typography>
              </Stack>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => void submitCategory()} disabled={Boolean(catalogError) || saving}>
                Добавить группу
              </Button>
            </Stack>

            {categories.length === 0 ? (
              <Alert severity="info">Группы услуг пока не заведены или недоступны.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Название</TableCell>
                      <TableCell>Порядок</TableCell>
                      <TableCell>Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} hover>
                        <TableCell>{category.id}</TableCell>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>{category.displayOrder ?? '—'}</TableCell>
                        <TableCell>{category.active === false ? 'Неактивна' : 'Активна'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>

          <SectionCard title="Услуги">
            {catalogError && <Alert severity="warning" sx={{ mb: 2 }}>{catalogError}</Alert>}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography color="text.secondary">Создание, редактирование и активация каталога услуг CRM.</Typography>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateServiceDialog} disabled={Boolean(catalogError)}>
                Добавить услугу
              </Button>
            </Stack>

            {services.length === 0 ? (
              <Alert severity="info">Услуги пока не заведены или недоступны.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Группа</TableCell>
                      <TableCell>Услуга</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Базовая цена</TableCell>
                      <TableCell>Длительность</TableCell>
                      <TableCell>Пункты инспекции</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell align="right">Действие</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id} hover>
                        <TableCell>{service.id}</TableCell>
                        <TableCell>{service.categoryName ?? categoryMap[service.categoryId ?? -1]?.name ?? '—'}</TableCell>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>{service.description || '—'}</TableCell>
                        <TableCell>{formatMoney(service.basePrice != null ? String(service.basePrice) : null)}</TableCell>
                        <TableCell>{service.defaultDurationMinutes != null ? `${service.defaultDurationMinutes} мин` : '—'}</TableCell>
                        <TableCell>{service.inspectionItems?.length ? service.inspectionItems.join(', ') : '—'}</TableCell>
                        <TableCell>{service.active === false ? 'Неактивна' : 'Активна'}</TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditServiceDialog(service)}>
                            Изменить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </>
      )}

      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{serviceDraft.id ? 'Редактирование услуги' : 'Новая услуга'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Группа услуг"
              value={serviceDraft.categoryId}
              onChange={(event) => setServiceDraft((current) => ({ ...current, categoryId: event.target.value }))}
              disabled={saving}
            >
              <MenuItem value="">Без группы</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Название услуги" value={serviceDraft.name} onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
            <TextField label="Описание" multiline minRows={3} value={serviceDraft.description} onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))} disabled={saving} />
            <TextField label="Базовая цена" value={serviceDraft.basePrice} onChange={(event) => setServiceDraft((current) => ({ ...current, basePrice: event.target.value }))} disabled={saving} helperText="Обязательное числовое поле, например 2500" />
            <TextField label="Длительность по умолчанию, минут" value={serviceDraft.defaultDurationMinutes} onChange={(event) => setServiceDraft((current) => ({ ...current, defaultDurationMinutes: event.target.value }))} disabled={saving} helperText="Можно оставить пустым" />
            <TextField label="Пункты инспекции" multiline minRows={4} value={serviceDraft.inspectionItemsText} onChange={(event) => setServiceDraft((current) => ({ ...current, inspectionItemsText: event.target.value }))} disabled={saving} helperText="Один пункт на строку. Пустые строки будут удалены перед отправкой." />
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch checked={serviceDraft.active} onChange={(event) => setServiceDraft((current) => ({ ...current, active: event.target.checked }))} disabled={saving} />
              <Typography>{serviceDraft.active ? 'Услуга активна' : 'Услуга скрыта/неактивна'}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)} disabled={saving}>Отмена</Button>
          <Button variant="contained" onClick={() => void submitService()} disabled={saving}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

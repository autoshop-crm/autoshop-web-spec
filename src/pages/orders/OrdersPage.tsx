import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
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
import { Link } from 'react-router-dom';
import { customersApi } from '../../api/customersApi';
import { employeesApi } from '../../api/employeesApi';
import { ordersApi } from '../../api/ordersApi';
import { vehiclesApi } from '../../api/vehiclesApi';
import { AppAlert } from '../../components/AppAlert';
import { AccessDeniedState } from '../../components/AccessDeniedState';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { StatusChip } from '../../components/StatusChip';
import { mapCrmOrderSearchResponse, mapQueueSummary } from '../../mappers/crmMappers';
import { AuthUser, Customer, EmployeeDirectoryItem, OrderCrmStatus, OrderListItemViewModel, Vehicle } from '../../types/models';
import { formatDateTime, formatMoney, fullName } from '../../utils/format';
import { crmOrderStatuses, getOrderStatusLabel } from '../../utils/orderStatus';
import { hasAnyRole } from '../../utils/roles';
import { getApiErrorMessage } from '../../utils/apiErrors';

const defaultStatus: OrderCrmStatus = 'WAITING_FOR_VISIT';
const defaultPageSize = 20;

const toStartOfDayIso = (value: string) => value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
const toEndOfDayIso = (value: string) => value ? new Date(`${value}T23:59:59`).toISOString() : undefined;

const queueSummaryLabels: Array<{ key: keyof ReturnType<typeof mapQueueSummary>; label: string }> = [
  { key: 'waitingForVisit', label: 'Ожидают визита' },
  { key: 'accepted', label: 'Приняты' },
  { key: 'diagnosisInProgress', label: 'Диагностика' },
  { key: 'waitingForOwnerApproval', label: 'На согласовании' },
  { key: 'waitingForPart', label: 'Ждут запчасть' },
  { key: 'repairInProgress', label: 'В ремонте' },
  { key: 'readyForOwner', label: 'Готовы к выдаче' }
];

export const OrdersPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const [status, setStatus] = useState<OrderCrmStatus | ''>(defaultStatus);
  const [employeeId, setEmployeeId] = useState('');
  const [plannedFrom, setPlannedFrom] = useState('');
  const [plannedTo, setPlannedTo] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(defaultPageSize);
  const [orders, setOrders] = useState<OrderListItemViewModel[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [queueSummary, setQueueSummary] = useState<ReturnType<typeof mapQueueSummary> | null>(null);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [customersById, setCustomersById] = useState<Record<number, Customer>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<number, Vehicle>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);

  const hydrateRowContext = async (items: OrderListItemViewModel[]) => {
    const missingCustomerIds = [...new Set(items.map((item) => item.customerId).filter((id) => !customersById[id]))];
    const missingVehicleIds = [...new Set(items.map((item) => item.vehicleId).filter((id) => !vehiclesById[id]))];

    const [customersResult, vehiclesResult] = await Promise.allSettled([
      Promise.all(missingCustomerIds.map((id) => customersApi.getById(id))),
      Promise.all(missingVehicleIds.map((id) => vehiclesApi.getById(id)))
    ]);

    if (customersResult.status === 'fulfilled' && customersResult.value.length > 0) {
      setCustomersById((current) => ({
        ...current,
        ...Object.fromEntries(customersResult.value.map((customer) => [customer.id, customer]))
      }));
    }

    if (vehiclesResult.status === 'fulfilled' && vehiclesResult.value.length > 0) {
      setVehiclesById((current) => ({
        ...current,
        ...Object.fromEntries(vehiclesResult.value.map((vehicle) => [vehicle.id, vehicle]))
      }));
    }
  };

  const loadOrders = async (nextPage = page, nextEmployeeId = employeeId) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await ordersApi.searchCrmOrders({
        status: status || undefined,
        employeeId: nextEmployeeId ? Number(nextEmployeeId) : undefined,
        plannedFrom: toStartOfDayIso(plannedFrom),
        plannedTo: toEndOfDayIso(plannedTo),
        q: query.trim() || undefined,
        page: nextPage,
        size
      });
      const response = mapCrmOrderSearchResponse(data);
      setOrders(response.items);
      setPage(response.page);
      setHasMore(response.hasMore);
      setTotalElements(response.totalElements ?? null);
      await hydrateRowContext(response.items);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Не удалось загрузить CRM-список заказов.', {
        badRequest: 'Фильтры CRM-поиска заполнены некорректно.',
        notFound: 'CRM search сейчас не вернул данные по заказам.',
        conflict: 'Список заказов временно конфликтует с текущим состоянием backend. Повтори запрос.'
      }));
      setOrders([]);
      setHasMore(false);
      setTotalElements(null);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    const [employeesResult, queueSummaryResult] = await Promise.allSettled([
      employeesApi.getAll(),
      ordersApi.getQueueSummary()
    ]);

    if (employeesResult.status === 'fulfilled') {
      setEmployees(employeesResult.value);
    }

    if (queueSummaryResult.status === 'fulfilled') {
      setQueueSummary(mapQueueSummary(queueSummaryResult.value));
    } else {
      setQueueSummary(null);
    }
  };

  useEffect(() => {
    void loadReferenceData();
    void loadOrders(0);
  }, []);


  const applyOwnOrdersFilter = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      if (hasAnyRole(currentUser?.roles, ['MECHANIC'])) {
        const data = await ordersApi.getMyOrders();
        const items = data.map((order) => mapCrmOrderSearchResponse({ items: [order], page: 0, size: data.length || 20, hasMore: false }).items[0]).filter(Boolean);
        setOrders(items);
        setPage(0);
        setHasMore(false);
        setTotalElements(items.length);
        await hydrateRowContext(items);
        return;
      }

      if (!currentUser?.email) return;
      const matchedEmployees = await employeesApi.searchByQuery(currentUser.email);
      const exactMatch = matchedEmployees.find((employee) => employee.email?.toLowerCase() === currentUser.email?.toLowerCase());

      if (!exactMatch) {
        setError('Не удалось найти сотрудника по email текущего аккаунта.');
        return;
      }

      setEmployeeId(String(exactMatch.id));
      setPage(0);
      await loadOrders(0, String(exactMatch.id));
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Не удалось отфильтровать заказы текущего сотрудника.'));
      setOrders([]);
      setHasMore(false);
      setTotalElements(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus(defaultStatus);
    setEmployeeId('');
    setPlannedFrom('');
    setPlannedTo('');
    setQuery('');
    setPage(0);
    setSize(defaultPageSize);
    setOrders([]);
    setError(null);
    setSearched(false);
    setHasMore(false);
    setTotalElements(null);
  };

  const customerSummary = (order: OrderListItemViewModel) => {
    const customer = customersById[order.customerId];
    if (!customer) return `#${order.customerId}`;
    return `${fullName(customer.firstName, customer.lastName)} · ${customer.phoneNumber}`;
  };

  const vehicleSummary = (order: OrderListItemViewModel) => {
    const vehicle = vehiclesById[order.vehicleId];
    if (!vehicle) return `#${order.vehicleId}`;
    return `${vehicle.brand} ${vehicle.model} · ${vehicle.licensePlate || vehicle.vin}`;
  };

  if (!hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'])) {
    return <AccessDeniedState description="Раздел заказов доступен только staff-ролям CRM." />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Заказы</Typography>
        <Button component={Link} to="/orders/new" variant="contained" startIcon={<AddRoundedIcon />}>
          Добавить
        </Button>
      </Stack>

      {queueSummary && (
        <SectionCard title="Операционная очередь">
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {queueSummaryLabels.map((item) => (
              <Chip key={item.key} label={`${item.label}: ${queueSummary[item.key]}`} variant="outlined" />
            ))}
          </Stack>
        </SectionCard>
      )}

      <SectionCard title="CRM-список заказов">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
          <TextField select fullWidth label="CRM-статус" value={status} onChange={(event) => setStatus(event.target.value as OrderCrmStatus | '')}>
            <MenuItem value="">Все статусы</MenuItem>
            {crmOrderStatuses.map((item) => (
              <MenuItem key={item} value={item}>
                {getOrderStatusLabel(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Сотрудник" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <MenuItem value="">Все сотрудники</MenuItem>
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={String(employee.id)}>
                {fullName(employee.firstName, employee.lastName)} · {employee.function}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Клиент, VIN, номер, проблема"
          />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
          <TextField
            fullWidth
            label="План от"
            type="date"
            value={plannedFrom}
            onChange={(event) => setPlannedFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="План до"
            type="date"
            value={plannedTo}
            onChange={(event) => setPlannedTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Размер страницы"
            value={String(size)}
            onChange={(event) => setSize(Number(event.target.value))}
            sx={{ minWidth: 180 }}
          >
            {[10, 20, 50].map((value) => (
              <MenuItem key={value} value={String(value)}>{value}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadOrders(0)}>
            Найти
          </Button>
          <Button variant="outlined" onClick={() => void applyOwnOrdersFilter()} disabled={!currentUser?.email}>
            Мои заказы
          </Button>
          <Button variant="text" onClick={reset}>
            Сбросить
          </Button>
        </Stack>

        {totalElements != null && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Найдено: {totalElements} · Страница: {page + 1}
          </Typography>
        )}

        {error && <AppAlert message={error} onRetry={() => void loadOrders(page)} />}
        {loading && <LoadingTable />}
        {!loading && !error && searched && orders.length === 0 && (
          <EmptyState
            title="Ничего не найдено"
            description="CRM search не вернул заказов по текущим фильтрам."
            action={<EmptyStateResetButton onClick={reset} label="Очистить фильтры" />}
          />
        )}
        {!loading && !error && orders.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Клиент</TableCell>
                    <TableCell>Автомобиль</TableCell>
                    <TableCell>Проблема</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Сотрудник</TableCell>
                    <TableCell>План</TableCell>
                    <TableCell>Сумма</TableCell>
                    <TableCell>Создан</TableCell>
                    <TableCell align="right">Действие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{customerSummary(order)}</TableCell>
                      <TableCell>{vehicleSummary(order)}</TableCell>
                      <TableCell>{order.problem}</TableCell>
                      <TableCell><StatusChip status={order.crmStatus} /></TableCell>
                      <TableCell>
                        {order.employeeId ? fullName(employeeMap[order.employeeId]?.firstName, employeeMap[order.employeeId]?.lastName) : 'Не назначен'}
                      </TableCell>
                      <TableCell>{formatDateTime(order.plannedVisitAt)}</TableCell>
                      <TableCell>{formatMoney(order.finalAmount ?? null)}</TableCell>
                      <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button component={Link} to={`/orders/${order.id}`} size="small">
                          Открыть
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                {hasMore ? 'Доступна следующая страница.' : 'Это последняя страница.'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button disabled={page === 0 || loading} onClick={() => void loadOrders(Math.max(page - 1, 0))}>
                  Назад
                </Button>
                <Button disabled={!hasMore || loading} onClick={() => void loadOrders(page + 1)}>
                  Вперёд
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </SectionCard>
    </Stack>
  );
};

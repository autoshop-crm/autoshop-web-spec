import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Alert, Button, Chip, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderRequestedPartsApi } from '../../api/orderRequestedPartsApi';
import { ordersApi } from '../../api/ordersApi';
import { partsApi } from '../../api/partsApi';
import { AppAlert } from '../../components/AppAlert';
import { AccessDeniedState } from '../../components/AccessDeniedState';
import { EmptyState } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, Order, OrderRequestedPart, Part } from '../../types/models';
import { formatDateTime, formatMoney } from '../../utils/format';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { getOrderStatusLabel } from '../../utils/orderStatus';
import { hasAnyRole } from '../../utils/roles';

interface RequestedPartRow {
  key: string;
  order: Order;
  requestedPart: OrderRequestedPart;
}

const requestedPartStatusLabel: Record<string, string> = {
  REQUESTED_BY_MECHANIC: 'Запрошена механиком',
  WAITING_CLIENT_APPROVAL: 'На согласовании',
  APPROVED_WAITING_ORDER: 'Одобрена, ждёт заказа',
  PENDING_CUSTOMER_APPROVAL: 'На согласовании',
  OUT_OF_STOCK: 'Запрошена',
  ORDERED_IN_TRANSIT: 'Заказана, в пути',
  IN_STOCK_RESERVED: 'Получена и зарезервирована',
  INSTALLED: 'Установлена',
  CLIENT_REJECTED: 'Отклонена клиентом',
  QUOTE_EXPIRED: 'Предложение устарело',
  CANCELLED: 'Отменена'
};

const requestedPartStatusTone: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  REQUESTED_BY_MECHANIC: 'warning',
  WAITING_CLIENT_APPROVAL: 'warning',
  APPROVED_WAITING_ORDER: 'warning',
  PENDING_CUSTOMER_APPROVAL: 'warning',
  OUT_OF_STOCK: 'warning',
  ORDERED_IN_TRANSIT: 'warning',
  IN_STOCK_RESERVED: 'success',
  INSTALLED: 'success',
  CLIENT_REJECTED: 'error',
  QUOTE_EXPIRED: 'error',
  CANCELLED: 'error'
};

const openOrderStatuses = [
  'WAITING_FOR_VISIT',
  'ACCEPTED',
  'DIAGNOSIS_IN_PROGRESS',
  'WAITING_FOR_OWNER_APPROVAL',
  'WAITING_FOR_PART',
  'REPAIR_IN_PROGRESS',
  'READY_FOR_OWNER',
  'NEW',
  'IN_PROGRESS'
];

export const PartsWarehousePage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const [items, setItems] = useState<Part[]>([]);
  const [requestedPartRows, setRequestedPartRows] = useState<RequestedPartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const normalized = query.trim().toLowerCase();
      const partsPromise = partsApi.search({
        name: normalized || undefined,
        articleNumber: normalized || undefined,
        availableOnly
      });

      const ordersPromise = ordersApi.searchCrmOrders({
        page: 0,
        size: 100,
        q: normalized || undefined
      });

      const [partsResult, ordersResult] = await Promise.all([partsPromise, ordersPromise]);
      setItems(partsResult);

      const relevantOrders = ordersResult.items.filter((order) => openOrderStatuses.includes(order.crmStatus ?? order.status));
      const requestedResults = await Promise.allSettled(
        relevantOrders.map(async (order) => {
          const requestedParts = await orderRequestedPartsApi.listByOrderId(order.id);
          return requestedParts.map((requestedPart) => ({
            key: `${order.id}-${requestedPart.id}`,
            order,
            requestedPart
          }));
        })
      );

      const allRequestedRows = requestedResults
        .filter((result): result is PromiseFulfilledResult<RequestedPartRow[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .filter((row) => {
          if (!normalized) return true;
          return [
            row.requestedPart.articleNumber,
            row.requestedPart.brand,
            row.requestedPart.name,
            String(row.order.id),
            row.order.problem
          ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
        });

      setRequestedPartRows(allRequestedRows);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Не удалось загрузить обзор запчастей.', {
        badRequest: 'Параметры поиска запчастей заполнены некорректно.',
        notFound: 'Запчасти и заказанные позиции по текущему запросу не найдены.',
        conflict: 'Данные по складу или заказанным деталям сейчас обновляются. Повтори поиск через пару секунд.'
      }));
      setItems([]);
      setRequestedPartRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const sortedRequestedPartRows = useMemo(() => {
    return [...requestedPartRows].sort((left, right) => {
      const leftDate = new Date(left.requestedPart.createdAt).getTime();
      const rightDate = new Date(right.requestedPart.createdAt).getTime();
      return rightDate - leftDate;
    });
  }, [requestedPartRows]);

  if (!hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER'])) {
    return <AccessDeniedState description="Раздел обзора запчастей доступен только администраторам и менеджерам." />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Inventory2RoundedIcon color="primary" />
        <Typography variant="h4">Запчасти и потребности</Typography>
      </Stack>

      <SectionCard title="Поиск по запчастям и заказанным позициям">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField fullWidth label="Артикул, бренд, название, заказ" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
            <Typography>Только в наличии на складе</Typography>
          </Stack>
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadItems()}>Найти</Button>
        </Stack>
      </SectionCard>

      {error && <AppAlert message={error} onRetry={() => void loadItems()} />}
      {loading && <LoadingTable />}

      {!loading && !error && items.length === 0 && requestedPartRows.length === 0 && (
        <EmptyState title="Ничего не найдено" description="Измени запрос или отключи фильтр наличия." />
      )}

      {!loading && !error && (
        <SectionCard title="Заказанные детали по заказам">
          {sortedRequestedPartRows.length === 0 ? (
            <Alert severity="info">Заказанных деталей по текущему фильтру пока нет.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Заказ</TableCell>
                    <TableCell>Статус заказа</TableCell>
                    <TableCell>Артикул</TableCell>
                    <TableCell>Бренд</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Кол-во</TableCell>
                    <TableCell>Статус детали</TableCell>
                    <TableCell>Закупка</TableCell>
                    <TableCell>Создана</TableCell>
                    <TableCell align="right">Действие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRequestedPartRows.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell>#{row.order.id}</TableCell>
                      <TableCell>
                        <Chip label={getOrderStatusLabel(row.order.crmStatus ?? row.order.status)} size="small" />
                      </TableCell>
                      <TableCell>{row.requestedPart.articleNumber}</TableCell>
                      <TableCell>{row.requestedPart.brand ?? '—'}</TableCell>
                      <TableCell>{row.requestedPart.name}</TableCell>
                      <TableCell>{row.requestedPart.requestedQuantity}</TableCell>
                      <TableCell>
                        <Chip
                          label={requestedPartStatusLabel[row.requestedPart.status] ?? row.requestedPart.status}
                          color={requestedPartStatusTone[row.requestedPart.status] ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {row.requestedPart.purchasePrice != null ? formatMoney(String(row.requestedPart.purchasePrice)) : '—'}
                      </TableCell>
                      <TableCell>{formatDateTime(row.requestedPart.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button component={Link} to={`/orders/${row.order.id}`} size="small">Открыть заказ</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      )}

      {!loading && !error && items.length > 0 && (
        <SectionCard title="Складские позиции">
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Артикул</TableCell>
                  <TableCell>Бренд</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>На складе</TableCell>
                  <TableCell>Зарезервировано</TableCell>
                  <TableCell>Доступно</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.articleNumber}</TableCell>
                    <TableCell>{item.brand ?? '—'}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.stockQuantity}</TableCell>
                    <TableCell>{item.reservedQuantity}</TableCell>
                    <TableCell>{item.availableQuantity}</TableCell>
                    <TableCell>{formatMoney(String(item.cost))}</TableCell>
                    <TableCell>
                      <Chip label={item.availableQuantity > 0 ? 'На складе' : 'Нет на складе'} color={item.availableQuantity > 0 ? 'success' : 'default'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {!loading && !error && availableOnly && items.length > 0 && (
        <Alert severity="info">Показаны только складские позиции, доступные для резерва. Заказанные детали по заказам остаются видимыми для контроля потребностей.</Alert>
      )}
    </Stack>
  );
};

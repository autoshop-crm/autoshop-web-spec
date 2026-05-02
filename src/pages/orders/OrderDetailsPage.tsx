import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { Alert, Button, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { filesApi } from '../../api/filesApi';
import { loyaltyApi } from '../../api/loyaltyApi';
import { ordersApi } from '../../api/ordersApi';
import { AppAlert } from '../../components/AppAlert';
import { DetailGrid } from '../../components/DetailGrid';
import { EmptyState } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { StatusChip } from '../../components/StatusChip';
import { AuthUser, FileItem, LoyaltyAccount, Order, OrderPartItem, OrderStatus } from '../../types/models';
import { formatDateTime, formatMoney } from '../../utils/format';
import { hasAnyRole } from '../../utils/roles';

const statuses: OrderStatus[] = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const OrderDetailsPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const navigate = useNavigate();
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [parts, setParts] = useState<OrderPartItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('NEW');
  const [employeeId, setEmployeeId] = useState('');
  const [laborTotal, setLaborTotal] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [partId, setPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [loyaltyPoints, setLoyaltyPoints] = useState('0');

  const canManage = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC']);
  const canSpendLoyalty = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  const uploadedBy = useMemo(() => currentUser?.email ?? undefined, [currentUser]);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderData = await ordersApi.getById(orderId);
      setOrder(orderData);
      setStatusDraft(orderData.status);
      setEmployeeId(orderData.employeeId ? String(orderData.employeeId) : '');
      setLaborTotal(orderData.laborTotal ? String(orderData.laborTotal) : '0');
      setDiscountAmount(orderData.discountAmount ? String(orderData.discountAmount) : '0');

      const [partsData, filesData, loyaltyData] = await Promise.all([
        ordersApi.getParts(Number(orderId)),
        filesApi.listByOwner('ORDER', orderId),
        loyaltyApi.getAccountByCustomerId(orderData.customerId)
      ]);
      setParts(partsData);
      setFiles(filesData.items);
      setLoyalty(loyaltyData);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить карточку заказа.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, [orderId]);

  const wrapAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      await loadPage();
    } catch (requestError: any) {
      setActionError(requestError?.response?.data?.message ?? 'Операция не выполнена.');
    }
  };

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await wrapAction(async () => {
      await filesApi.upload({
        category: 'ORDER_ATTACHMENT',
        ownerType: 'ORDER',
        ownerId: orderId,
        uploadedBy,
        file
      });
    });
    event.target.value = '';
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>Назад</Button>
        <Typography variant="h4">Заказ #{order?.id ?? orderId}</Typography>
        {order && <StatusChip status={order.status} />}
      </Stack>

      {error && <AppAlert message={error} onRetry={() => void loadPage()} />}
      {loading && <LoadingTable />}
      {!loading && !error && order && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard title="Основная информация">
              <DetailGrid items={[
                { label: 'Клиент ID', value: order.customerId },
                { label: 'Автомобиль ID', value: order.vehicleId },
                { label: 'Сотрудник ID', value: order.employeeId ?? '—' },
                { label: 'Проблема', value: order.problem },
                { label: 'Создан', value: formatDateTime(order.createdAt) },
                { label: 'Обновлен', value: formatDateTime(order.updatedAt) },
                { label: 'Завершен', value: formatDateTime(order.completedAt) }
              ]} />
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard title="Финансы">
              <Stack spacing={2}>
                <Typography>Работы: {formatMoney(order.laborTotal)}</Typography>
                <Typography>Запчасти: {formatMoney(order.partsTotal)}</Typography>
                <Typography>Скидка: {formatMoney(order.discountAmount)}</Typography>
                <Typography variant="h6">Итог: {formatMoney(order.finalAmount)}</Typography>
                <Button component={Link} to={`/customers/${order.customerId}`} variant="outlined">Открыть клиента</Button>
                <Button component={Link} to={`/vehicles/${order.vehicleId}`} variant="outlined">Открыть автомобиль</Button>
              </Stack>
            </SectionCard>
          </Grid>

          {canManage && (
            <Grid size={{ xs: 12, lg: 6 }}>
              <SectionCard title="Операции по заказу">
                <Stack spacing={2}>
                  {actionError && <Alert severity="error">{actionError}</Alert>}
                  <TextField select label="Статус" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}>
                    {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                  </TextField>
                  <Button variant="contained" onClick={() => void wrapAction(async () => setOrder(await ordersApi.updateStatus(order.id, statusDraft)))}>Обновить статус</Button>

                  <TextField label="Employee ID" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
                  <Button variant="outlined" onClick={() => void wrapAction(async () => setOrder(await ordersApi.assignEmployee(order.id, Number(employeeId))))} disabled={!employeeId}>Назначить сотрудника</Button>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField fullWidth label="Стоимость работ" value={laborTotal} onChange={(event) => setLaborTotal(event.target.value)} />
                    <TextField fullWidth label="Скидка" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                  </Stack>
                  <Button variant="outlined" onClick={() => void wrapAction(async () => setOrder(await ordersApi.updateEstimate(order.id, Number(laborTotal), Number(discountAmount))))}>Обновить смету</Button>
                </Stack>
              </SectionCard>
            </Grid>
          )}

          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard title="Loyalty">
              <Stack spacing={2}>
                <Typography>Баланс клиента: {loyalty?.pointsBalance ?? '—'} баллов</Typography>
                <Typography>Списано в заказе: {order.loyaltyPointsSpent ?? 0} баллов</Typography>
                {canSpendLoyalty && (
                  <>
                    <TextField label="Списать баллы" value={loyaltyPoints} onChange={(event) => setLoyaltyPoints(event.target.value)} />
                    <Stack direction="row" spacing={2}>
                      <Button variant="contained" onClick={() => void wrapAction(async () => setOrder(await ordersApi.spendLoyalty(order.id, Number(loyaltyPoints))))}>Применить</Button>
                      <Button variant="text" onClick={() => void wrapAction(async () => setOrder(await ordersApi.removeLoyalty(order.id)))}>Снять списание</Button>
                    </Stack>
                  </>
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid size={12}>
            <SectionCard title="Запчасти заказа">
              <Stack spacing={2}>
                {canManage && (
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField fullWidth label="Part ID" value={partId} onChange={(event) => setPartId(event.target.value)} />
                    <TextField fullWidth label="Количество" value={partQty} onChange={(event) => setPartQty(event.target.value)} />
                    <Button variant="contained" onClick={() => void wrapAction(async () => { await ordersApi.addPart(order.id, Number(partId), Number(partQty)); setPartId(''); setPartQty('1'); })} disabled={!partId}>Добавить запчасть</Button>
                  </Stack>
                )}

                {parts.length === 0 ? (
                  <EmptyState title="Запчастей пока нет" description="Добавьте `partId` из складского контура для этого заказа." />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Part ID</TableCell><TableCell>Название</TableCell><TableCell>Кол-во</TableCell><TableCell>Цена</TableCell><TableCell>Сумма</TableCell><TableCell align="right">Действие</TableCell></TableRow></TableHead>
                      <TableBody>
                        {parts.map((part) => (
                          <TableRow key={part.id} hover>
                            <TableCell>{part.id}</TableCell>
                            <TableCell>{part.partId}</TableCell>
                            <TableCell>{part.name ?? '—'}</TableCell>
                            <TableCell>{part.quantity}</TableCell>
                            <TableCell>{formatMoney(part.unitPrice)}</TableCell>
                            <TableCell>{formatMoney(part.lineTotal)}</TableCell>
                            <TableCell align="right">
                              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void wrapAction(async () => await ordersApi.deletePart(order.id, part.id))}>Удалить</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </SectionCard>
          </Grid>

          <Grid size={12}>
            <SectionCard title="Файлы заказа" action={<Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>Загрузить<input hidden type="file" onChange={onUploadFile} /></Button>}>
              {files.length === 0 ? (
                <EmptyState title="Файлов пока нет" description="Механик или менеджер может загрузить фото и вложения по заказу." />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead><TableRow><TableCell>Файл</TableCell><TableCell>Категория</TableCell><TableCell>Размер</TableCell><TableCell>Загрузил</TableCell><TableCell>Создан</TableCell><TableCell align="right">Действие</TableCell></TableRow></TableHead>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id} hover>
                          <TableCell>{file.originalFilename}</TableCell>
                          <TableCell>{file.category}</TableCell>
                          <TableCell>{Math.round(file.sizeBytes / 1024)} KB</TableCell>
                          <TableCell>{file.uploadedBy ?? '—'}</TableCell>
                          <TableCell>{formatDateTime(file.createdAt)}</TableCell>
                          <TableCell align="right"><Button color="error" onClick={() => void wrapAction(async () => await filesApi.delete(file.id))}>Удалить</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
};

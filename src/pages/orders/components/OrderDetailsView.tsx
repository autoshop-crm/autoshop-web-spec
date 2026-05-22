import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { Alert, Button, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppAlert } from '../../../components/AppAlert';
import { DetailGrid } from '../../../components/DetailGrid';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingTable } from '../../../components/LoadingTable';
import { SectionCard } from '../../../components/SectionCard';
import { StatusChip } from '../../../components/StatusChip';
import { FileItem, Order } from '../../../types/models';
import { formatDateTime, formatMoney } from '../../../utils/format';
import { filesApi } from '../../../api/filesApi';

export interface OrderPageHeaderProps {
  orderId: string;
  order: Order | null;
  onBack: () => void;
}

export const OrderPageHeader = ({ orderId, order, onBack }: OrderPageHeaderProps) => (
  <Stack spacing={2}>
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={onBack}>Назад</Button>
      <Typography variant="h4">Заказ #{order?.id ?? orderId}</Typography>
      {order && <StatusChip status={order.crmStatus ?? order.status} />}
    </Stack>
    {order && (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
        {order.plannedVisitAt && <Chip label={`Запись: ${formatDateTime(order.plannedVisitAt)}`} size="small" variant="outlined" />}
        {order.checkedInAt && <Chip label={`Принят: ${formatDateTime(order.checkedInAt)}`} size="small" variant="outlined" />}
        {order.readyForOwnerAt && <Chip label={`Готов: ${formatDateTime(order.readyForOwnerAt)}`} size="small" variant="outlined" />}
        {order.handedOverAt && <Chip label={`Выдан: ${formatDateTime(order.handedOverAt)}`} size="small" variant="outlined" />}
      </Stack>
    )}
  </Stack>
);

export const OrderSummarySection = ({ order }: { order: Order }) => {
  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ').trim() || `ID ${order.customerId}`;
  const vehicleName = [order.vehicleBrand, order.vehicleModel, order.vehicleLicensePlate].filter(Boolean).join(' · ').trim() || `ID ${order.vehicleId}`;
  const employeeName = order.employeeId
    ? ([order.employeeFirstName, order.employeeLastName].filter(Boolean).join(' ').trim() || order.employeeEmail || `ID ${order.employeeId}`)
    : '—';

  return (
    <SectionCard title="Контекст заказа">
      <DetailGrid items={[
        { label: 'Клиент', value: customerName },
        { label: 'Телефон', value: order.customerPhoneNumber ?? '—' },
        { label: 'Email', value: order.customerEmail ?? '—' },
        { label: 'Автомобиль', value: vehicleName },
        { label: 'VIN', value: order.vehicleVin ?? '—' },
        { label: 'Сотрудник', value: employeeName },
        { label: 'Email сотрудника', value: order.employeeEmail ?? '—' },
        { label: 'Проблема', value: order.problem || '—' },
        { label: 'Заметки приёмки', value: order.intakeNotes ?? '—' },
        { label: 'Создан', value: formatDateTime(order.createdAt) },
        { label: 'Обновлён', value: formatDateTime(order.updatedAt) },
        { label: 'Завершён', value: formatDateTime(order.completedAt) }
      ]} />
    </SectionCard>
  );
};

export const OrderFinanceSection = ({ order }: { order: Order }) => (
  <SectionCard title="Финансы и ссылки">
    <Stack spacing={2}>
      <Typography>Работы: {formatMoney(order.laborTotal)}</Typography>
      <Typography>Запчасти: {formatMoney(order.partsTotal)}</Typography>
      <Typography>Скидка: {formatMoney(order.discountAmount)}</Typography>
      <Typography variant="h6">Итог: {formatMoney(order.finalAmount)}</Typography>
      <Button component={Link} to={`/customers/${order.customerId}`} variant="outlined">Открыть клиента</Button>
      <Button component={Link} to={`/vehicles/${order.vehicleId}`} variant="outlined">Открыть автомобиль</Button>
    </Stack>
  </SectionCard>
);

export const OrderSectionShell = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <SectionCard title={title} action={action}>{children}</SectionCard>
);

export interface OrderFilesSectionProps {
  files: FileItem[];
  filesError: string | null;
  onUploadFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteFile: (fileId: string) => void;
}

export const OrderFilesSection = ({ files, filesError, onUploadFile, onDeleteFile }: OrderFilesSectionProps) => (
  <SectionCard title="Файлы заказа" action={<Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>Загрузить<input hidden type="file" onChange={onUploadFile} /></Button>}>
    {filesError && <Alert severity="warning" sx={{ mb: 2 }}>{filesError}</Alert>}
    {files.length === 0 ? (
      <EmptyState title="Файлы ещё не загружены" description="Прикрепи фото, акт или другое вложение по заказу." />
    ) : (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя файла</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Загрузил</TableCell>
              <TableCell>Добавлен</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>{file.originalFilename}</TableCell>
                <TableCell>{file.contentType}</TableCell>
                <TableCell>{file.uploadedBy ?? '—'}</TableCell>
                <TableCell>{formatDateTime(file.createdAt)}</TableCell>
                <TableCell align="right">
                  <Button component="a" href={filesApi.getDownloadUrl(file.id)} target="_blank" rel="noreferrer">Открыть</Button>
                  <Button color="error" onClick={() => onDeleteFile(file.id)}>Удалить</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </SectionCard>
);

export const OrderDetailsView = ({
  orderId,
  order,
  loading,
  error,
  onRetry,
  onBack,
  summarySection,
  financeSection,
  dialogs,
  children
}: {
  orderId: string;
  order: Order | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
  summarySection: ReactNode;
  financeSection?: ReactNode;
  dialogs?: ReactNode;
  children?: ReactNode;
}) => {
  if (loading) {
    return <LoadingTable />;
  }

  if (error) {
    return <AppAlert message={error} onRetry={onRetry} />;
  }

  return (
    <Stack spacing={3}>
      <OrderPageHeader orderId={orderId} order={order} onBack={onBack} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: financeSection ? 7 : 12 }}>{summarySection}</Grid>
        {financeSection && <Grid size={{ xs: 12, lg: 5 }}>{financeSection}</Grid>}
        {children}
      </Grid>
      {dialogs}
    </Stack>
  );
};

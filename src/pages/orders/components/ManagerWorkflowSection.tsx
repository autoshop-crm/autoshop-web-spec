import { Alert, Button, Chip, Divider, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ApprovalRequestDTO, EmployeeAvailabilitySearchItem, Order, OrderServiceLineDTO } from '../../../types/models';
import { EmptyState } from '../../../components/EmptyState';
import { SectionCard } from '../../../components/SectionCard';
import { formatDateTime, formatMoney } from '../../../utils/format';
import { EmployeeAvailabilityLookupField } from '../../../components/EmployeeAvailabilityLookupField';

export interface ManagerWorkflowSectionProps {
  order: Order;
  serviceLines: OrderServiceLineDTO[];
  approvals: ApprovalRequestDTO[];
  employeeId: string;
  selectedEmployee: EmployeeAvailabilitySearchItem | null;
  laborTotal: string;
  discountAmount: string;
  canAssignEmployee: boolean;
  canEditDiscount: boolean;
  canUpdateEstimate: boolean;
  onSelectedEmployeeChange: (employee: EmployeeAvailabilitySearchItem | null) => void;
  actionError: string | null;
  onEmployeeIdChange: (value: string) => void;
  onAssignEmployee: () => void;
  onLaborTotalChange: (value: string) => void;
  onDiscountAmountChange: (value: string) => void;
  onUpdateEstimate: () => void;
  approvalComment: string;
  onApprovalCommentChange: (value: string) => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export const ManagerWorkflowSection = ({
  order,
  serviceLines,
  approvals,
  employeeId,
  selectedEmployee,
  laborTotal,
  discountAmount,
  canAssignEmployee,
  canEditDiscount,
  canUpdateEstimate,
  onSelectedEmployeeChange,
  actionError,
  onEmployeeIdChange,
  onAssignEmployee,
  onLaborTotalChange,
  onDiscountAmountChange,
  onUpdateEstimate,
  approvalComment,
  onApprovalCommentChange,
  onApprove,
  onReject
}: ManagerWorkflowSectionProps) => {
  const pendingApprovals = approvals.filter((item) => item.requestStatus === 'OPEN');
  const approvalRelevantLines = serviceLines.filter((line) => line.requiresOwnerApproval);

  return (
    <SectionCard title="Менеджерский workflow">
      <Stack spacing={3}>
        {actionError && <Alert severity="error">{actionError}</Alert>}

        <div>
          <Typography variant="h6" gutterBottom>Потребности заказа</Typography>
          <Stack spacing={1.5}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700}>Проблема клиента</Typography>
              <Typography color="text.secondary">{order.problem || 'Не указана'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700}>Работы, требующие внимания менеджера</Typography>
              {approvalRelevantLines.length === 0 ? (
                <Typography color="text.secondary">Нет отдельных работ, помеченных как требующих согласования.</Typography>
              ) : (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {approvalRelevantLines.map((line) => (
                    <Stack key={line.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography>{line.name}</Typography>
                      <Chip size="small" color={line.approvedByOwner ? 'success' : 'warning'} label={line.approvedByOwner ? 'Согласовано' : 'Требует решения клиента'} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </div>

        <Divider />

        <div>
          <Typography variant="h6" gutterBottom>Координация исполнителя</Typography>
          {canAssignEmployee ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
              <EmployeeAvailabilityLookupField
                label="Сотрудник для назначения"
                value={selectedEmployee}
                onChange={onSelectedEmployeeChange}
                plannedVisitAt={order.plannedVisitAt ?? null}
                slotMinutes={order.plannedSlotMinutes ?? null}
                roles={['MECHANIC', 'MANAGER']}
                helperText="Показываются сотрудники, свободные на текущий слот заказа."
              />
              <Button variant="outlined" onClick={onAssignEmployee} disabled={!employeeId}>Назначить / переназначить</Button>
            </Stack>
          ) : (
            <Alert severity="info">Назначение сотрудника недоступно для текущей роли.</Alert>
          )}
        </div>

        <Divider />

        <div>
          <Typography variant="h6" gutterBottom>Финансовое решение</Typography>
          {canUpdateEstimate ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField fullWidth label="Стоимость работ" value={laborTotal} onChange={(event) => onLaborTotalChange(event.target.value)} />
                {canEditDiscount && <TextField fullWidth label="Скидка" value={discountAmount} onChange={(event) => onDiscountAmountChange(event.target.value)} />}
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="body2">Текущие работы: {formatMoney(order.laborTotal)}</Typography>
                <Typography variant="body2">Текущая сумма деталей: {formatMoney(order.partsTotal)}</Typography>
                <Typography variant="body2">Итог по заказу: {formatMoney(order.finalAmount)}</Typography>
              </Stack>
              <Button variant="contained" onClick={onUpdateEstimate}>Обновить экономику заказа</Button>
            </Stack>
          ) : (
            <Alert severity="info">Редактирование сметы недоступно.</Alert>
          )}
        </div>

        <Divider />

        <div>
          <Typography variant="h6" gutterBottom>Согласования допработ</Typography>
          {pendingApprovals.length === 0 ? (
            <EmptyState title="Нет активных согласований" description="Когда механик создаст допработу на согласование, она появится здесь." />
          ) : (
            <Stack spacing={2}>
              <TextField
                label="Комментарий к решению"
                value={approvalComment}
                onChange={(event) => onApprovalCommentChange(event.target.value)}
                multiline
                minRows={2}
              />
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Запрос</TableCell>
                      <TableCell>Работы</TableCell>
                      <TableCell>Детали</TableCell>
                      <TableCell>Создан</TableCell>
                      <TableCell align="right">Решение</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApprovals.map((approval) => (
                      <TableRow key={approval.requestId} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{approval.title ?? 'Допработа'}</Typography>
                          <Typography variant="body2" color="text.secondary">{approval.description ?? 'Без описания'}</Typography>
                        </TableCell>
                        <TableCell>{formatMoney(approval.laborAmount ?? null)}</TableCell>
                        <TableCell>{formatMoney(approval.partsAmount ?? null)}</TableCell>
                        <TableCell>{formatDateTime(approval.requestedAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                            <Button size="small" color="success" variant="contained" onClick={() => onApprove(approval.requestId)}>Согласовать</Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => onReject(approval.requestId)}>Отклонить</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </div>
      </Stack>
    </SectionCard>
  );
};

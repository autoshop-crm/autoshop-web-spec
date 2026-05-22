import { Alert, Button, Chip, Divider, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Paper } from '@mui/material';
import { ApprovalRequestDTO, MechanicWorkDraftViewModel, OrderServiceLineDTO, ServiceCatalogItemDTO } from '../../../types/models';
import { EmptyState } from '../../../components/EmptyState';
import { SectionCard } from '../../../components/SectionCard';
import { formatDateTime, formatMoney } from '../../../utils/format';

export interface MechanicWorkspaceSectionProps {
  serviceLines: OrderServiceLineDTO[];
  approvals: ApprovalRequestDTO[];
  serviceCatalogItems: ServiceCatalogItemDTO[];
  loadingCatalog: boolean;
  draft: MechanicWorkDraftViewModel;
  customerContactChannel: string;
  draftError: string | null;
  canEdit: boolean;
  onDraftChange: (patch: Partial<MechanicWorkDraftViewModel>) => void;
  onContactChannelChange: (value: string) => void;
  onSubmit: () => void;
}

const scenarioDescriptions: Record<MechanicWorkDraftViewModel['approvalScenario'], string> = {
  LABOR: 'Согласование только дополнительных работ без новой детали.',
  PART: 'Согласование только новой детали без стоимости работ.',
  LABOR_AND_PART: 'Согласование и работ, и новой детали в одном запросе.'
};

const submitLabels: Record<MechanicWorkDraftViewModel['approvalScenario'], string> = {
  LABOR: 'Согласовать работу',
  PART: 'Согласовать деталь',
  LABOR_AND_PART: 'Согласовать работу и деталь'
};

export const MechanicWorkspaceSection = ({
  serviceLines,
  approvals,
  serviceCatalogItems,
  loadingCatalog,
  draft,
  customerContactChannel,
  draftError,
  canEdit,
  onDraftChange,
  onContactChannelChange,
  onSubmit
}: MechanicWorkspaceSectionProps) => {
  const openApprovals = approvals.filter((item) => item.requestStatus === 'OPEN');
  const showLaborFields = draft.approvalScenario === 'LABOR' || draft.approvalScenario === 'LABOR_AND_PART';
  const showPartFields = draft.approvalScenario === 'PART' || draft.approvalScenario === 'LABOR_AND_PART';

  const handleScenarioChange = (scenario: MechanicWorkDraftViewModel['approvalScenario']) => {
    onDraftChange({
      approvalScenario: scenario,
      laborAmount: scenario === 'PART' ? '' : draft.laborAmount,
      partsAmount: scenario === 'LABOR' ? '' : draft.partsAmount,
      requestedPartArticleNumber: scenario === 'LABOR' ? '' : draft.requestedPartArticleNumber,
      requestedPartBrand: scenario === 'LABOR' ? '' : draft.requestedPartBrand,
      requestedPartName: scenario === 'LABOR' ? '' : draft.requestedPartName,
      requestedPartQuantity: scenario === 'LABOR' ? '1' : draft.requestedPartQuantity || '1',
      serviceCatalogItemId: scenario === 'PART' ? null : draft.serviceCatalogItemId
    });
  };

  return (
    <SectionCard title="Рабочий блок механика">
      <Stack spacing={3}>
        <div>
          <Typography variant="h6" gutterBottom>Что уже назначено</Typography>
          {serviceLines.length === 0 ? (
            <EmptyState title="Работы пока не назначены" description="Здесь появятся базовые и согласованные работы по заказу." />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Работа</TableCell>
                    <TableCell>Описание</TableCell>
                    <TableCell>Цена</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceLines.map((line) => (
                    <TableRow key={line.id} hover>
                      <TableCell>{line.name}</TableCell>
                      <TableCell>{line.description ?? '—'}</TableCell>
                      <TableCell>{line.lineTotal ?? line.unitPrice ? formatMoney(line.lineTotal ?? line.unitPrice ?? null) : '—'}</TableCell>
                      <TableCell>
                        {line.requiresOwnerApproval ? (
                          <Chip size="small" color={line.approvedByOwner ? 'success' : 'warning'} label={line.approvedByOwner ? 'Согласовано' : 'Ожидает согласования'} />
                        ) : (
                          <Chip size="small" label="В работе" color="info" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>

        <Divider />

        <div>
          <Typography variant="h6" gutterBottom>Открытые согласования</Typography>
          {openApprovals.length === 0 ? (
            <EmptyState title="Нет активных согласований" description="Когда появятся допработы или работы на согласование, они будут видны здесь." />
          ) : (
            <Stack spacing={1.5}>
              {openApprovals.map((approval) => (
                <Paper key={approval.requestId} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight={700}>{approval.title ?? 'Дополнительная работа'}</Typography>
                      <Chip size="small" color="warning" label="Ожидает решения клиента" />
                    </Stack>
                    <Typography color="text.secondary">{approval.description ?? 'Без описания'}</Typography>
                    <Typography variant="body2">Сумма работ: {formatMoney(approval.laborAmount ?? null)}</Typography>
                    <Typography variant="body2">Сумма деталей: {formatMoney(approval.partsAmount ?? null)}</Typography>
                    <Typography variant="caption" color="text.secondary">Создано: {formatDateTime(approval.requestedAt)}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </div>

        <Divider />

        <div>
          <Typography variant="h6" gutterBottom>Добавить допработу или деталь</Typography>
          <Stack spacing={2}>
            {draftError && <Alert severity="warning">{draftError}</Alert>}

            <TextField
              select
              label="Сценарий согласования"
              value={draft.approvalScenario}
              onChange={(event) => handleScenarioChange(event.target.value as MechanicWorkDraftViewModel['approvalScenario'])}
              disabled={!canEdit}
              helperText={scenarioDescriptions[draft.approvalScenario]}
            >
              <MenuItem value="LABOR">Работа</MenuItem>
              <MenuItem value="PART">Деталь</MenuItem>
              <MenuItem value="LABOR_AND_PART">Работа + деталь</MenuItem>
            </TextField>

            {draft.approvalScenario !== 'PART' && (
              <TextField
                select
                label="Стандартная услуга"
                value={draft.serviceCatalogItemId ? String(draft.serviceCatalogItemId) : ''}
                onChange={(event) => {
                  const nextId = event.target.value ? Number(event.target.value) : null;
                  const selected = serviceCatalogItems.find((item) => item.id === nextId);
                  onDraftChange({
                    serviceCatalogItemId: nextId,
                    title: selected?.name ?? draft.title,
                    description: selected?.description ?? draft.description,
                    laborAmount: selected?.basePrice != null ? String(selected.basePrice) : draft.laborAmount
                  });
                }}
                disabled={!canEdit || loadingCatalog}
                helperText={loadingCatalog ? 'Загружаем каталог услуг…' : 'Можно выбрать стандартную услугу или заполнить поля вручную.'}
              >
                <MenuItem value="">Свободное описание</MenuItem>
                {serviceCatalogItems.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField label="Заголовок согласования" value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} disabled={!canEdit} />
            <TextField label="Описание" value={draft.description ?? ''} onChange={(event) => onDraftChange({ description: event.target.value })} multiline minRows={3} disabled={!canEdit} />

            {showLaborFields && (
              <TextField
                fullWidth
                label="Сумма работ"
                type="number"
                value={draft.laborAmount ?? ''}
                onChange={(event) => onDraftChange({ laborAmount: event.target.value })}
                disabled={!canEdit}
              />
            )}

            {showPartFields && (
              <Stack spacing={2}>
                <TextField label="Артикул детали" value={draft.requestedPartArticleNumber ?? ''} onChange={(event) => onDraftChange({ requestedPartArticleNumber: event.target.value })} disabled={!canEdit} />
                <TextField label="Бренд детали" value={draft.requestedPartBrand ?? ''} onChange={(event) => onDraftChange({ requestedPartBrand: event.target.value })} disabled={!canEdit} />
                <TextField label="Название детали" value={draft.requestedPartName ?? ''} onChange={(event) => onDraftChange({ requestedPartName: event.target.value })} disabled={!canEdit} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField fullWidth label="Количество" type="number" value={draft.requestedPartQuantity ?? ''} onChange={(event) => onDraftChange({ requestedPartQuantity: event.target.value })} disabled={!canEdit} />
                  <TextField fullWidth label="Сумма деталей" type="number" value={draft.partsAmount ?? ''} onChange={(event) => onDraftChange({ partsAmount: event.target.value })} disabled={!canEdit} />
                </Stack>
              </Stack>
            )}

            <TextField
              fullWidth
              select
              label="Канал уведомления клиента"
              value={customerContactChannel}
              onChange={(event) => onContactChannelChange(event.target.value)}
              disabled={!canEdit}
            >
              <MenuItem value="WEB">Web</MenuItem>
              <MenuItem value="IN_PERSON">Лично</MenuItem>
            </TextField>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip
                label={draft.requiresOwnerApproval ? 'Требует согласования владельца' : 'Можно выполнить без обязательного согласования'}
                color={draft.requiresOwnerApproval ? 'warning' : 'success'}
                onClick={canEdit ? () => onDraftChange({ requiresOwnerApproval: !draft.requiresOwnerApproval }) : undefined}
                variant={draft.requiresOwnerApproval ? 'filled' : 'outlined'}
              />
              <Button variant="contained" onClick={onSubmit} disabled={!canEdit || !draft.title.trim()}>
                {submitLabels[draft.approvalScenario]}
              </Button>
            </Stack>
          </Stack>
        </div>
      </Stack>
    </SectionCard>
  );
};

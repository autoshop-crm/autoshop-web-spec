import { Alert, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { ApprovalRequestDTO } from '../../../types/models';
import { formatDateTime, formatMoney } from '../../../utils/format';

const approvalStatusTone: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  OPEN: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
  EXPIRED: 'default'
};

const approvalStatusLabel: Record<string, string> = {
  OPEN: 'Ожидает решения',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
  CANCELLED: 'Отменено',
  EXPIRED: 'Истекло'
};

const approvalTypeLabel: Record<string, string> = {
  EXTRA_WORK: 'Допработы',
  PART_ONLY: 'Запчасти',
  MIXED_SCOPE_CHANGE: 'Смешанное изменение'
};

export interface ApprovalsSectionProps {
  approvals: ApprovalRequestDTO[];
  canManageApprovalDecisions: boolean;
  approvalComment: string;
  onApprovalCommentChange: (value: string) => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export const ApprovalsSection = ({
  approvals,
  canManageApprovalDecisions,
  approvalComment,
  onApprovalCommentChange,
  onApprove,
  onReject
}: ApprovalsSectionProps) => {
  if (approvals.length === 0) {
    return <Alert severity="info">Пока нет approval requests по заказу.</Alert>;
  }

  const sortedApprovals = [...approvals].sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime());

  return (
    <Stack spacing={2}>
      {sortedApprovals.map((approval) => {
        const isOpen = approval.requestStatus === 'OPEN';
        const requestedPart = approval.requestedPart;

        return (
          <Paper key={approval.requestId} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={approvalStatusLabel[approval.requestStatus] ?? approval.requestStatus}
                    color={approvalStatusTone[approval.requestStatus] ?? 'default'}
                    size="small"
                  />
                  {approval.approvalType && (
                    <Chip label={approvalTypeLabel[approval.approvalType] ?? approval.approvalType} variant="outlined" size="small" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Запрошено: {formatDateTime(approval.requestedAt)}
                </Typography>
              </Stack>

              <div>
                <Typography variant="subtitle1">{approval.title ?? 'Дополнительное согласование'}</Typography>
                {approval.description && <Typography color="text.secondary">{approval.description}</Typography>}
              </div>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Typography variant="body2">Работы: {formatMoney(approval.laborAmount ?? null)}</Typography>
                <Typography variant="body2">Запчасти: {formatMoney(approval.partsAmount ?? null)}</Typography>
                <Typography variant="body2">Итого: {formatMoney(approval.totalAmount ?? null)}</Typography>
              </Stack>

              {(approval.customerContactChannel || approval.expiresAt) && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {approval.customerContactChannel && (
                    <Typography variant="body2">Канал связи: {approval.customerContactChannel}</Typography>
                  )}
                  {approval.expiresAt && (
                    <Typography variant="body2">Срок ответа: {formatDateTime(approval.expiresAt)}</Typography>
                  )}
                </Stack>
              )}

              {requestedPart && (
                <>
                  <Divider />
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Запрошенная запчасть</Typography>
                    <Typography variant="body2">
                      {requestedPart.articleNumber} · {requestedPart.brand ?? '—'} · {requestedPart.name ?? 'Без названия'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Количество: {requestedPart.quantity ?? '—'}
                    </Typography>
                  </Stack>
                </>
              )}

              {canManageApprovalDecisions && isOpen && (
                <>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2">Решение менеджера</Typography>
                    <textarea
                      value={approvalComment}
                      onChange={(event) => onApprovalCommentChange(event.target.value)}
                      placeholder="Комментарий к решению"
                      style={{
                        width: '100%',
                        minHeight: 84,
                        resize: 'vertical',
                        padding: 12,
                        borderRadius: 8,
                        borderColor: 'rgba(0,0,0,0.23)',
                        font: 'inherit'
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button color="success" variant="contained" onClick={() => onApprove(approval.requestId)}>
                        Согласовать
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => onReject(approval.requestId)}>
                        Отклонить
                      </Button>
                    </Stack>
                  </Stack>
                </>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

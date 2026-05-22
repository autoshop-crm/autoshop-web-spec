import { Alert, Chip, Paper, Stack, Typography } from '@mui/material';
import { OrderTimelineEntryResponseDTO } from '../../../types/models';
import { formatDateTime } from '../../../utils/format';
import { StatusChip } from '../../../components/StatusChip';

const actorTypeLabel: Record<string, string> = {
  SYSTEM: 'Система',
  CUSTOMER: 'Клиент',
  RECEPTIONIST: 'Ресепшен',
  MECHANIC: 'Механик',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
  AUTOMATION_JOB: 'Автоматизация'
};

const parseDetails = (detailsJson?: string | null): Array<{ key: string; value: string }> => {
  if (!detailsJson) return [];

  try {
    const parsed = JSON.parse(detailsJson) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [{ key: 'details', value: String(parsed) }];
    }

    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  } catch {
    return [{ key: 'details', value: detailsJson }];
  }
};

export const TimelineSection = ({ timeline }: { timeline: OrderTimelineEntryResponseDTO[] }) => {
  if (timeline.length === 0) {
    return <Alert severity="info">История заказа пока пуста.</Alert>;
  }

  const sortedTimeline = [...timeline].sort((left, right) => {
    const leftDate = new Date(left.occurredAt ?? left.createdAt ?? 0).getTime();
    const rightDate = new Date(right.occurredAt ?? right.createdAt ?? 0).getTime();
    return rightDate - leftDate;
  });

  return (
    <Stack spacing={2}>
      {sortedTimeline.map((entry) => {
        const details = parseDetails(entry.detailsJson);
        const actorLabel = entry.actorDisplayName ?? actorTypeLabel[entry.actorType ?? ''] ?? entry.actorType ?? '—';
        const happenedAt = entry.occurredAt ?? entry.createdAt ?? null;

        return (
          <Paper key={entry.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={entry.eventType} size="small" variant="outlined" />
                  {entry.effectiveStatus && <StatusChip status={entry.effectiveStatus} />}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(happenedAt)}
                </Typography>
              </Stack>

              <div>
                <Typography variant="subtitle1">{entry.title ?? entry.summary ?? 'Событие заказа'}</Typography>
                {entry.summary && entry.title && entry.summary !== entry.title && (
                  <Typography variant="body2" color="text.secondary">{entry.summary}</Typography>
                )}
                {entry.description && <Typography variant="body2" color="text.secondary">{entry.description}</Typography>}
              </div>

              <Typography variant="body2">Источник: {actorLabel}</Typography>

              {details.length > 0 && (
                <Stack spacing={0.5}>
                  {details.map((detail) => (
                    <Typography key={`${entry.id}-${detail.key}`} variant="body2" color="text.secondary">
                      {detail.key}: {detail.value}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

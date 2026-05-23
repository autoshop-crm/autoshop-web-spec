import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  Alert,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { BookingDateAvailabilityItem } from '../api/customerBookingApi';

interface BookingAvailabilityCalendarProps {
  availability: BookingDateAvailabilityItem[];
  value: string;
  onChange: (date: string) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthTitle = (value: Date) => value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);

const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0);

const startOfWeekMonday = (value: Date) => {
  const date = new Date(value);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return date;
};

const endOfWeekSunday = (value: Date) => {
  const date = new Date(value);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() + (6 - weekday));
  return date;
};

const addMonths = (value: Date, amount: number) => new Date(value.getFullYear(), value.getMonth() + amount, 1);

const reasonLabel: Record<string, string> = {
  PAST: 'Дата уже прошла',
  CLOSED: 'Сервис закрыт',
  NO_EMPLOYEE: 'Нет доступных сотрудников',
  FULL: 'Все слоты заняты'
};

export const BookingAvailabilityCalendar = ({
  availability,
  value,
  onChange,
  loading = false,
  error = null,
  disabled = false
}: BookingAvailabilityCalendarProps) => {
  const availabilityByDate = useMemo(
    () => Object.fromEntries(availability.map((item) => [item.date, item])),
    [availability]
  );

  const firstKnownDate = availability[0]?.date ?? '';
  const lastKnownDate = availability[availability.length - 1]?.date ?? '';

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    if (value) return startOfMonth(parseLocalDate(value));
    if (firstKnownDate) return startOfMonth(parseLocalDate(firstKnownDate));
    return startOfMonth(new Date());
  });

  useEffect(() => {
    if (value) {
      setVisibleMonth(startOfMonth(parseLocalDate(value)));
      return;
    }
    if (firstKnownDate) {
      setVisibleMonth(startOfMonth(parseLocalDate(firstKnownDate)));
    }
  }, [firstKnownDate, value]);

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeekMonday(monthStart);
  const gridEnd = endOfWeekSunday(monthEnd);

  const cells = useMemo(() => {
    const dates: Date[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [gridEnd, gridStart]);

  const minMonth = firstKnownDate ? startOfMonth(parseLocalDate(firstKnownDate)) : null;
  const maxMonth = lastKnownDate ? startOfMonth(parseLocalDate(lastKnownDate)) : null;
  const canGoPrev = !minMonth || monthStart > minMonth;
  const canGoNext = !maxMonth || monthStart < maxMonth;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
          {monthTitle(visibleMonth)}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))} disabled={disabled || !canGoPrev}>
            <ChevronLeftRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))} disabled={disabled || !canGoNext}>
            <ChevronRightRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 1
        }}
      >
        {WEEK_DAYS.map((day) => (
          <Box key={day} sx={{ textAlign: 'center', color: 'text.secondary', typography: 'caption', py: 0.5 }}>
            {day}
          </Box>
        ))}

        {cells.map((date) => {
          const key = formatLocalDate(date);
          const item = availabilityByDate[key];
          const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
          const isSelected = key === value;
          const isAvailable = Boolean(item?.available);
          const isKnown = Boolean(item);
          const dayButton = (
            <Box
              component="button"
              type="button"
              onClick={() => {
                if (isAvailable && !disabled) {
                  onChange(key);
                }
              }}
              disabled={!isAvailable || disabled}
              sx={{
                width: '100%',
                minHeight: 44,
                borderRadius: 2,
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : isAvailable ? 'success.light' : 'divider',
                bgcolor: isSelected ? 'primary.main' : isAvailable ? 'success.light' : 'background.paper',
                color: isSelected ? 'primary.contrastText' : !isCurrentMonth ? 'text.disabled' : 'text.primary',
                opacity: isKnown ? 1 : 0.45,
                cursor: isAvailable && !disabled ? 'pointer' : 'not-allowed',
                font: 'inherit'
              }}
            >
              {date.getDate()}
            </Box>
          );

          return item && !isAvailable ? (
            <Tooltip key={key} title={reasonLabel[item.reason ?? ''] ?? 'Дата недоступна'}>
              <Box>{dayButton}</Box>
            </Tooltip>
          ) : (
            <Box key={key}>{dayButton}</Box>
          );
        })}
      </Box>

      {loading && <Alert severity="info">Загружаю доступные даты…</Alert>}
      {error && <Alert severity="warning">{error}</Alert>}
      {!loading && !error && availability.length === 0 && <Alert severity="info">Сначала выбери автомобиль и хотя бы одну услугу.</Alert>}
    </Stack>
  );
};

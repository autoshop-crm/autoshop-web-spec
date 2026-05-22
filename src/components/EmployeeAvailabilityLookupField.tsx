import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Autocomplete,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { employeesApi } from '../api/employeesApi';
import { EmployeeAvailabilitySearchItem, Role } from '../types/models';

interface EmployeeAvailabilityLookupFieldProps {
  value: EmployeeAvailabilitySearchItem | null;
  onChange: (employee: EmployeeAvailabilitySearchItem | null) => void;
  plannedVisitAt: string | null;
  slotMinutes: number | null;
  roles?: Role[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
}

const SEARCH_DEBOUNCE_MS = 400;

const optionLabel = (employee: EmployeeAvailabilitySearchItem) => `${employee.email ?? 'Без email'} · ${employee.firstName} ${employee.lastName}`.trim();

const getAvailabilityLabel = (employee: EmployeeAvailabilitySearchItem) => {
  if (employee.available) return 'Свободен';
  if (employee.nextConflict) {
    return `Занят: заказ #${employee.nextConflict.orderId}, ${employee.nextConflict.status}`;
  }
  return employee.availabilityReason;
};

export const EmployeeAvailabilityLookupField = ({
  value,
  onChange,
  plannedVisitAt,
  slotMinutes,
  roles = ['MECHANIC'],
  disabled,
  error,
  helperText,
  label = 'Сотрудник'
}: EmployeeAvailabilityLookupFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<EmployeeAvailabilitySearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, EmployeeAvailabilitySearchItem[]>>(new Map());

  useEffect(() => {
    if (!value) return;
    setInputValue(value.email ?? optionLabel(value));
  }, [value]);

  const canSearch = Boolean(plannedVisitAt && slotMinutes && slotMinutes > 0);
  const normalizedQuery = inputValue.trim().toLowerCase();
  const cacheKey = useMemo(() => JSON.stringify({ plannedVisitAt, slotMinutes, roles, query: normalizedQuery }), [plannedVisitAt, slotMinutes, roles, normalizedQuery]);

  useEffect(() => {
    if (!canSearch) {
      setOptions(value ? [value] : []);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setOptions(cached);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const data = await employeesApi.searchByAvailability({
          plannedVisitAt: plannedVisitAt!,
          slotMinutes: slotMinutes!,
          roles,
          query: normalizedQuery || undefined,
          limit: 20
        });
        cacheRef.current.set(cacheKey, data);
        setOptions(data);
      } catch (requestError: any) {
        if (axios.isCancel(requestError) || requestError?.code === 'ERR_CANCELED') {
          return;
        }
        setOptions([]);
        setSearchError(requestError?.response?.data?.message ?? 'Не удалось подобрать сотрудников на этот слот.');
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [cacheKey, canSearch, normalizedQuery, plannedVisitAt, roles, slotMinutes, value]);

  const resolvedHelperText = searchError
    ?? helperText
    ?? (!plannedVisitAt ? 'Сначала выберите дату и время записи.' : !slotMinutes ? 'Сначала выберите длительность слота.' : 'Поиск по имени, фамилии или email с учётом доступности.');

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={inputValue}
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'reset') return;
        setInputValue(nextValue);
      }}
      onChange={(_, nextValue) => onChange(nextValue)}
      filterOptions={(items) => items}
      getOptionLabel={(option) => optionLabel(option)}
      isOptionEqualToValue={(option, currentValue) => option.id === currentValue.id}
      getOptionDisabled={(option) => !option.available}
      noOptionsText={canSearch ? 'Сотрудники не найдены' : 'Выберите дату, время и длительность'}
      loading={loading}
      disabled={disabled || !canSearch}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={resolvedHelperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} />,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack spacing={0.25}>
            <Typography>{option.email ?? 'Без email'}</Typography>
            <Typography variant="caption" color={option.available ? 'success.main' : 'text.secondary'}>
              {option.firstName} {option.lastName} · {option.function} · {getAvailabilityLabel(option)}
            </Typography>
          </Stack>
        </li>
      )}
    />
  );
};

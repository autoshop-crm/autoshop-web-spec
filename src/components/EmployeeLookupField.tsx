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
import { EmployeeDirectoryItem } from '../types/models';

interface EmployeeLookupFieldProps {
  value: EmployeeDirectoryItem | null;
  onChange: (employee: EmployeeDirectoryItem | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  label?: string;
}

const EMAIL_MIN_LENGTH = 5;
const SEARCH_DEBOUNCE_MS = 500;

const normalizeEmailQuery = (query: string) => query.trim().toLowerCase();

const getSearchMeta = (rawQuery: string) => {
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    return { canSearch: false, normalizedQuery: '', helper: 'Введите email сотрудника' };
  }

  if (!trimmed.includes('@')) {
    return {
      canSearch: false,
      normalizedQuery: '',
      helper: 'Поиск сотрудников работает только по email и только если запрос содержит @'
    };
  }

  const normalizedEmail = normalizeEmailQuery(trimmed);
  return {
    canSearch: normalizedEmail.length >= EMAIL_MIN_LENGTH,
    normalizedQuery: normalizedEmail,
    helper: normalizedEmail.length >= EMAIL_MIN_LENGTH
      ? 'Поиск сотрудника по началу email'
      : 'Введите минимум 5 символов email для поиска'
  };
};

const employeeLabel = (employee: EmployeeDirectoryItem) => `${employee.email ?? 'Без email'} · ${employee.firstName} ${employee.lastName}`.trim();

export const EmployeeLookupField = ({
  value,
  onChange,
  error,
  helperText,
  disabled,
  label = 'Сотрудник'
}: EmployeeLookupFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<EmployeeDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const cacheRef = useRef<Map<string, EmployeeDirectoryItem[]>>(new Map());

  useEffect(() => {
    if (!value) return;
    setInputValue(value.email ?? employeeLabel(value));
  }, [value]);

  const searchMeta = useMemo(() => getSearchMeta(inputValue), [inputValue]);

  useEffect(() => {
    const query = inputValue.trim();

    if (!query || value?.email === query) {
      setOptions(value ? [value] : []);
      setSearchError(null);
      setSearched(false);
      setLoading(false);
      return;
    }

    if (!searchMeta.canSearch || !searchMeta.normalizedQuery) {
      setOptions(value ? [value] : []);
      setSearchError(null);
      setSearched(false);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(searchMeta.normalizedQuery);
    if (cached) {
      setOptions(cached);
      setSearchError(null);
      setSearched(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const data = await employeesApi.searchByQuery(searchMeta.normalizedQuery);
        cacheRef.current.set(searchMeta.normalizedQuery, data);
        setOptions(data);
        setSearched(true);
      } catch (requestError: any) {
        if (axios.isCancel(requestError) || requestError?.code === 'ERR_CANCELED') {
          return;
        }
        setOptions([]);
        setSearchError(requestError?.response?.data?.message ?? 'Не удалось найти сотрудника.');
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [inputValue, searchMeta.canSearch, searchMeta.normalizedQuery, value]);

  const noOptionsText = useMemo(() => {
    if (!inputValue.trim()) return 'Введите email сотрудника';
    if (!searchMeta.canSearch) return searchMeta.helper;
    if (loading) return 'Поиск...';
    if (searchError) return searchError;
    if (searched) return 'Сотрудник не найден';
    return 'Нет вариантов';
  }, [inputValue, loading, searchError, searched, searchMeta]);

  const resolvedHelperText = searchError ?? helperText ?? searchMeta.helper;

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={inputValue}
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'reset') return;
        setInputValue(nextValue);
      }}
      onChange={(_, nextValue) => {
        onChange(nextValue);
        setSearchError(null);
        setSearched(false);
      }}
      filterOptions={(items) => items}
      getOptionLabel={(option) => employeeLabel(option)}
      isOptionEqualToValue={(option, currentValue) => option.id === currentValue.id}
      noOptionsText={noOptionsText}
      loading={loading}
      disabled={disabled}
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
            <Typography variant="caption" color="text.secondary">
              {option.firstName} {option.lastName} · {option.function}
            </Typography>
          </Stack>
        </li>
      )}
    />
  );
};

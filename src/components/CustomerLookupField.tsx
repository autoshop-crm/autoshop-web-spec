import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { customersApi } from '../api/customersApi';
import { Customer } from '../types/models';

interface CustomerLookupFieldProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  error?: boolean;
  helperText?: string;
  createCustomerPath?: string;
}

const EMAIL_MIN_LENGTH = 5;
const PHONE_MIN_DIGITS = 4;
const SEARCH_DEBOUNCE_MS = 500;

const fullName = (customer: Customer) => `${customer.lastName} ${customer.firstName}`.trim();

const normalizeEmailQuery = (query: string) => query.trim().toLowerCase();

const normalizePhoneQuery = (query: string) => query.replace(/\D/g, '');

const getSearchMeta = (rawQuery: string) => {
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    return { canSearch: false, normalizedQuery: '', helper: 'Введите email или минимум 4 цифры телефона' };
  }

  if (trimmed.includes('@')) {
    const normalizedEmail = normalizeEmailQuery(trimmed);
    return {
      canSearch: normalizedEmail.length >= EMAIL_MIN_LENGTH,
      normalizedQuery: normalizedEmail,
      helper: normalizedEmail.length >= EMAIL_MIN_LENGTH
        ? 'Поиск клиента по email'
        : 'Введите более полный email для поиска'
    };
  }

  const digits = normalizePhoneQuery(trimmed);
  if (!digits) {
    return {
      canSearch: false,
      normalizedQuery: '',
      helper: 'Для поиска по телефону введите минимум 4 цифры'
    };
  }

  return {
    canSearch: digits.length >= PHONE_MIN_DIGITS,
    normalizedQuery: digits,
    helper: digits.length >= PHONE_MIN_DIGITS
      ? 'Поиск клиента по телефону'
      : 'Введите минимум 4 цифры телефона'
  };
};

export const CustomerLookupField = ({ value, onChange, error, helperText, createCustomerPath = '/customers?create=1' }: CustomerLookupFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const cacheRef = useRef<Map<string, Customer[]>>(new Map());

  useEffect(() => {
    if (!value) {
      return;
    }

    setInputValue(value.email || value.phoneNumber || fullName(value));
  }, [value]);

  const searchMeta = useMemo(() => getSearchMeta(inputValue), [inputValue]);

  useEffect(() => {
    const query = inputValue.trim();

    if (!query || value?.email === query || value?.phoneNumber === query) {
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
        const data = await customersApi.searchByQuery(searchMeta.normalizedQuery, controller.signal);
        cacheRef.current.set(searchMeta.normalizedQuery, data);
        setOptions(data);
        setSearched(true);
      } catch (requestError: any) {
        if (axios.isCancel(requestError) || requestError?.code === 'ERR_CANCELED') {
          return;
        }
        setOptions([]);
        setSearchError(requestError?.response?.data?.message ?? 'Не удалось найти клиента.');
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
    if (!inputValue.trim()) {
      return 'Введите email или минимум 4 цифры телефона';
    }

    if (!searchMeta.canSearch) {
      return searchMeta.helper;
    }

    if (loading) {
      return 'Поиск...';
    }

    if (searchError) {
      return searchError;
    }

    if (searched) {
      return 'Клиент не найден';
    }

    return 'Нет вариантов';
  }, [inputValue, loading, searchError, searched, searchMeta]);

  const resolvedHelperText = searchError ?? helperText ?? `${searchMeta.helper}. Пример: ivan@mail.ru или 89616521391`;

  return (
    <Stack spacing={1.25}>
      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        onChange={(_, customer) => onChange(customer)}
        inputValue={inputValue}
        onInputChange={(_, nextValue, reason) => {
          setInputValue(nextValue);
          if (reason === 'clear') {
            onChange(null);
          }
        }}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        getOptionLabel={(option) => `${option.email} · ${option.phoneNumber}`}
        noOptionsText={noOptionsText}
        filterOptions={(items) => items}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Клиент"
            placeholder="Введите email или телефон"
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
        renderOption={(props, option) => {
          const { key, ...optionProps } = props;
          return (
            <Box component="li" key={key} {...optionProps}>
              <Stack spacing={0.25} py={0.25}>
                <Typography variant="body2" fontWeight={600}>{option.email}</Typography>
                <Typography variant="caption" color="text.secondary">{option.phoneNumber} · {fullName(option) || 'Без имени'}</Typography>
              </Stack>
            </Box>
          );
        }}
      />

      {searched && !loading && options.length === 0 && !searchError && searchMeta.canSearch && (
        <Button href={createCustomerPath} variant="text" startIcon={<AddRoundedIcon />} sx={{ alignSelf: 'flex-start' }}>
          Создать клиента
        </Button>
      )}
    </Stack>
  );
};

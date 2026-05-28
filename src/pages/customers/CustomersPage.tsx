import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { CustomerCreatePayload, customersApi } from '../../api/customersApi';
import { AppAlert } from '../../components/AppAlert';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, Customer } from '../../types/models';
import { formatDateTime, fullName } from '../../utils/format';
import { hasAnyRole } from '../../utils/roles';

const createSchema = z.object({
  firstName: z.string().min(2, 'Минимум 2 символа'),
  lastName: z.string().min(2, 'Минимум 2 символа'),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Введите корректный номер'),
  email: z.string().email('Введите корректный email')
});

type CustomerFormValues = z.infer<typeof createSchema>;
type SortDirection = 'asc' | 'desc';

const pageSizeOptions = [10, 20, 50];

export const CustomersPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searched, setSearched] = useState(false);

  const canCreate = hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', lastName: '', phoneNumber: '', email: '' }
  });

  const loadCustomers = async (searchValue = query) => {
    setLoading(true);
    setError(null);
    try {
      const normalized = searchValue.trim();
      const data = normalized ? await customersApi.searchByQuery(normalized) : await customersApi.search({});
      setCustomers(data);
      setSearched(Boolean(normalized));
      setPage(0);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить список клиентов.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers('');
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === '1' && canCreate) {
      setCreateOpen(true);
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete('create');
        return next;
      }, { replace: true });
    }
  }, [canCreate, searchParams, setSearchParams]);

  const resetFilters = () => {
    setQuery('');
    void loadCustomers('');
  };

  const onCreate = async (values: CustomerFormValues) => {
    setCreateError(null);
    try {
      const created = await customersApi.create(values as CustomerCreatePayload);
      setCreateOpen(false);
      reset();
      void loadCustomers(query);
      navigate(`/customers/${created.id}`);
    } catch (requestError: any) {
      setCreateError(requestError?.response?.data?.message ?? 'Не удалось создать клиента.');
    }
  };

  const sortedCustomers = useMemo(() => {
    const items = [...customers];
    items.sort((left, right) => sortDirection === 'asc' ? left.id - right.id : right.id - left.id);
    return items;
  }, [customers, sortDirection]);

  const pagedCustomers = useMemo(
    () => sortedCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedCustomers]
  );

  const handleChangePage = (_event: unknown, nextPage: number) => {
    setPage(nextPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Клиенты</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
            Добавить клиента
          </Button>
        )}
      </Stack>
      <SectionCard title="Справочник клиентов">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          <TextField
            fullWidth
            label="Поиск: email или телефон"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            helperText="Пример: `ivan@mail.ru` или `89616521391`"
          />
          <TextField
            select
            label="Сортировка ID"
            value={sortDirection}
            onChange={(event) => {
              setSortDirection(event.target.value as SortDirection);
              setPage(0);
            }}
            sx={{ width: { xs: '100%', md: 180 } }}
          >
            <MenuItem value="asc">По возрастанию</MenuItem>
            <MenuItem value="desc">По убыванию</MenuItem>
          </TextField>
          <TextField
            select
            label="На странице"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            sx={{ width: { xs: '100%', md: 150 } }}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            onClick={() => void loadCustomers()}
            sx={{ minWidth: 132, height: 56, alignSelf: { xs: 'stretch', md: 'flex-start' } }}
          >
            Найти
          </Button>
          <Button
            variant="text"
            onClick={resetFilters}
            sx={{ minWidth: 110, height: 56, alignSelf: { xs: 'stretch', md: 'flex-start' } }}
          >
            Сбросить
          </Button>
        </Stack>

        {error && <AppAlert message={error} onRetry={() => void loadCustomers()} />}
        {loading && <LoadingTable />}
        {!loading && !error && customers.length === 0 && (
          <EmptyState
            title={searched ? 'Ничего не найдено' : 'Список клиентов пуст'}
            description={searched ? 'Попробуйте очистить фильтры или изменить критерии поиска.' : 'Клиенты пока отсутствуют или ещё не загружены.'}
            action={<EmptyStateResetButton onClick={resetFilters} label="Очистить фильтры" />}
          />
        )}
        {!loading && !error && customers.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Клиент</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Обновлен</TableCell>
                  <TableCell align="right">Действие</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedCustomers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>{customer.id}</TableCell>
                    <TableCell>{fullName(customer.firstName, customer.lastName)}</TableCell>
                    <TableCell>{customer.phoneNumber}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{formatDateTime(customer.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/customers/${customer.id}`} size="small">Открыть</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={sortedCustomers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={pageSizeOptions}
              labelRowsPerPage="На странице"
            />
          </TableContainer>
        )}
      </SectionCard>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый клиент</DialogTitle>
        <form onSubmit={handleSubmit(onCreate)}>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label="Имя" error={Boolean(errors.firstName)} helperText={errors.firstName?.message ?? 'Пример: `Иван`'} {...register('firstName')} />
              <TextField label="Фамилия" error={Boolean(errors.lastName)} helperText={errors.lastName?.message ?? 'Пример: `Иванов`'} {...register('lastName')} />
              <TextField label="Телефон" error={Boolean(errors.phoneNumber)} helperText={errors.phoneNumber?.message ?? 'Пример: `89616521391` или `+79616521391`'} {...register('phoneNumber')} />
              <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message ?? 'Пример: `ivan@mail.ru`'} {...register('email')} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>Сохранить</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

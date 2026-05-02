import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { customersApi } from '../../api/customersApi';
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

export const CustomersPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      const data = await customersApi.search(
        normalized.includes('@')
          ? { email: normalized }
          : normalized.startsWith('+') || /^\d+$/.test(normalized)
            ? { phoneNumber: normalized }
            : normalized.includes(' ')
              ? { firstName: normalized.split(' ')[0], lastName: normalized.split(' ')[1] }
              : normalized
                ? { firstName: normalized }
                : {}
      );
      setCustomers(data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не удалось загрузить список клиентов.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers('');
  }, []);

  const resetFilters = () => {
    setQuery('');
    void loadCustomers('');
  };

  const onCreate = async (values: CustomerFormValues) => {
    setCreateError(null);
    try {
      const created = await customersApi.create(values);
      setCreateOpen(false);
      reset();
      void loadCustomers(query);
      window.location.href = `/customers/${created.id}`;
    } catch (requestError: any) {
      setCreateError(requestError?.response?.data?.message ?? 'Не удалось создать клиента.');
    }
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
          <TextField fullWidth label="Поиск: email, телефон, имя" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadCustomers()}>
            Найти
          </Button>
          <Button variant="text" onClick={resetFilters}>Сбросить</Button>
        </Stack>

        {error && <AppAlert message={error} onRetry={() => void loadCustomers()} />}
        {loading && <LoadingTable />}
        {!loading && !error && customers.length === 0 && (
          <EmptyState title="Ничего не найдено" description="Попробуйте очистить фильтры или изменить критерии поиска." action={<EmptyStateResetButton onClick={resetFilters} label="Очистить фильтры" />} />
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
                {customers.map((customer) => (
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
          </TableContainer>
        )}
      </SectionCard>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый клиент</DialogTitle>
        <form onSubmit={handleSubmit(onCreate)}>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label="Имя" error={Boolean(errors.firstName)} helperText={errors.firstName?.message} {...register('firstName')} />
              <TextField label="Фамилия" error={Boolean(errors.lastName)} helperText={errors.lastName?.message} {...register('lastName')} />
              <TextField label="Телефон" error={Boolean(errors.phoneNumber)} helperText={errors.phoneNumber?.message} {...register('phoneNumber')} />
              <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
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

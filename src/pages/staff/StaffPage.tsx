import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import { employeesApi } from '../../api/employeesApi';
import { authStorage } from '../../auth/storage';
import { AppAlert } from '../../components/AppAlert';
import { EmptyState, EmptyStateResetButton } from '../../components/EmptyState';
import { LoadingTable } from '../../components/LoadingTable';
import { SectionCard } from '../../components/SectionCard';
import { AuthUser, EmployeeDirectoryItem, Role, StaffUserResponse } from '../../types/models';
import { formatDateTime } from '../../utils/format';
import { hasAnyRole, roleLabel } from '../../utils/roles';

const availableRoles: Role[] = ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST'];

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  firstName: z.string().min(2, 'Минимум 2 символа'),
  lastName: z.string().min(2, 'Минимум 2 символа'),
  role: z.enum(['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST'])
});

type StaffFormValues = z.infer<typeof schema>;

export const StaffPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const [createdUser, setCreatedUser] = useState<StaffUserResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const isAdmin = hasAnyRole(currentUser?.roles, ['ADMIN']);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StaffFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'MANAGER'
    }
  });

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void loadEmployees('');
  }, [isAdmin]);

  if (!isAdmin) {
    return <AppAlert title="Нет доступа" message="Экран сотрудников доступен только администратору." />;
  }

  const loadEmployees = async (searchValue = query) => {
    setLoading(true);
    setDirectoryError(null);
    try {
      const normalized = searchValue.trim();
      const data = normalized ? await employeesApi.searchByQuery(normalized) : await employeesApi.getAll();
      setEmployees(data);
      setSearched(Boolean(normalized));
    } catch (error: any) {
      setDirectoryError(error?.response?.data?.message ?? 'Не удалось загрузить список сотрудников.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const resetDirectoryFilters = () => {
    setQuery('');
    void loadEmployees('');
  };

  const onSubmit = async (values: StaffFormValues) => {
    setSubmitError(null);
    const accessToken = authStorage.getToken();
    if (!accessToken) return;

    try {
      const user = await authApi.createStaffUser(accessToken, {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        roles: [values.role]
      });
      setCreatedUser(user);
      void loadEmployees(query);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? 'Не удалось создать сотрудника.');
    }
  };

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4">Сотрудники</Typography>
        <Typography color="text.secondary">Справочник сотрудников и создание staff-пользователей для роли `ADMIN`.</Typography>
      </div>

      <SectionCard title="Список сотрудников" action={<Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>К форме создания</Button>}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          <TextField
            fullWidth
            label="Поиск по email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            helperText="Пример: `manager@autoshop.ru`"
          />
          <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadEmployees()} sx={{ minWidth: 132, height: 56, alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
            Найти
          </Button>
          <Button variant="text" onClick={resetDirectoryFilters} sx={{ minWidth: 110, height: 56, alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
            Сбросить
          </Button>
        </Stack>

        {directoryError && <AppAlert message={directoryError} onRetry={() => void loadEmployees()} />}
        {loading && <LoadingTable />}
        {!loading && !directoryError && employees.length === 0 && (
          <EmptyState
            title={searched ? 'Сотрудники не найдены' : 'Список сотрудников пуст'}
            description={searched ? 'Попробуйте изменить email для поиска.' : 'Backend пока не вернул ни одной записи сотрудников.'}
            action={<EmptyStateResetButton onClick={resetDirectoryFilters} label="Очистить фильтры" />}
          />
        )}
        {!loading && !directoryError && employees.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Имя</TableCell>
                  <TableCell>Фамилия</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Создан</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>{employee.id}</TableCell>
                    <TableCell>{employee.email ?? '—'}</TableCell>
                    <TableCell>{employee.firstName}</TableCell>
                    <TableCell>{employee.lastName}</TableCell>
                    <TableCell>
                      <Chip label={roleLabel(employee.function)} size="small" />
                    </TableCell>
                    <TableCell>{employee.createdAt ? formatDateTime(employee.createdAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <Card>
        <CardContent>
          <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: '50%' }, minWidth: { md: 360 } }}>
            <Stack spacing={3}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              {createdUser && (
                <Alert severity="success">
                  Создан пользователь: {createdUser.email}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message ?? 'Пример: `manager@autoshop.ru`'} {...register('email')} />
                  <TextField label="Пароль" type="password" error={Boolean(errors.password)} helperText={errors.password?.message ?? 'Пример: минимум 8 символов, например `Admin1234`'} {...register('password')} />
                  <TextField label="Имя" error={Boolean(errors.firstName)} helperText={errors.firstName?.message ?? 'Пример: `Павел`'} {...register('firstName')} />
                  <TextField label="Фамилия" error={Boolean(errors.lastName)} helperText={errors.lastName?.message ?? 'Пример: `Смирнов`'} {...register('lastName')} />
                  <TextField select label="Роль" error={Boolean(errors.role)} helperText={errors.role?.message} defaultValue="MANAGER" {...register('role')}>
                    {availableRoles.map((role) => <MenuItem key={role} value={role}>{roleLabel(role)}</MenuItem>)}
                  </TextField>
                  <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: 'flex-start' }}>
                    Создать сотрудника
                  </Button>
                </Stack>
              </form>

              {createdUser && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography>Роли:</Typography>
                  {createdUser.roles.map((role) => <Chip key={role} label={roleLabel(role)} size="small" />)}
                </Stack>
              )}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

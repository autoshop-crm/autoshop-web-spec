import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import { authStorage } from '../../auth/storage';
import { AppAlert } from '../../components/AppAlert';
import { AuthUser, Role, StaffUserResponse } from '../../types/models';
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

  if (!isAdmin) {
    return <AppAlert title="Нет доступа" message="Экран сотрудников доступен только администратору." />;
  }

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
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? 'Не удалось создать сотрудника.');
    }
  };

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4">Сотрудники</Typography>
        <Typography color="text.secondary">Создание staff-пользователей через `POST /api/admin/users`.</Typography>
      </div>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            {createdUser && (
              <Alert severity="success">
                Создан пользователь: {createdUser.email}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
                <TextField label="Пароль" type="password" error={Boolean(errors.password)} helperText={errors.password?.message} {...register('password')} />
                <TextField label="Имя" error={Boolean(errors.firstName)} helperText={errors.firstName?.message} {...register('firstName')} />
                <TextField label="Фамилия" error={Boolean(errors.lastName)} helperText={errors.lastName?.message} {...register('lastName')} />
                <TextField select label="Роль" error={Boolean(errors.role)} helperText={errors.role?.message} defaultValue="MANAGER" {...register('role')}>
                  {availableRoles.map((role) => <MenuItem key={role} value={role}>{roleLabel(role)}</MenuItem>)}
                </TextField>
                <Button type="submit" variant="contained" disabled={isSubmitting}>Создать сотрудника</Button>
              </Stack>
            </form>

            {createdUser && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>Роли:</Typography>
                {createdUser.roles.map((role) => <Chip key={role} label={roleLabel(role)} size="small" />)}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import { authStorage } from '../../auth/storage';
import { AuthUser } from '../../types/models';
import { resolveLoginErrorMessage } from '../../utils/httpError';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль')
});

type LoginFormValues = z.infer<typeof schema>;

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  isAuthenticated: boolean;
}

export const LoginPage = ({ onLogin, isAuthenticated }: LoginPageProps) => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@autoshop.local',
      password: 'Admin123!'
    }
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      const response = await authApi.login(values);
      authStorage.setToken(response.accessToken);
      authStorage.setRefreshToken(response.refreshToken);
      const user = await authApi.me(response.accessToken);
      authStorage.setUser(user);
      onLogin(user);
      navigate('/');
    } catch (error: any) {
      setSubmitError(resolveLoginErrorMessage(error));
      authStorage.clear();
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" px={2}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1} alignItems="center">
              <DirectionsCarFilledRoundedIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5">AutoShop CRM</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Рабочий кабинет сотрудников через backend gateway
              </Typography>
            </Stack>

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField label="Email" type="email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
                <TextField label="Пароль" type="password" error={Boolean(errors.password)} helperText={errors.password?.message} {...register('password')} />
                <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
                  {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

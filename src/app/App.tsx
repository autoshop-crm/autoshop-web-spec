import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CircularProgress, Stack } from '@mui/material';
import { AppLayout } from '../layouts/AppLayout';
import { authApi } from '../api/authApi';
import { authStorage } from '../auth/storage';
import { AuthUser } from '../types/models';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { CustomerDetailsPage } from '../pages/customers/CustomerDetailsPage';
import { VehiclesPage } from '../pages/vehicles/VehiclesPage';
import { VehicleDetailsPage } from '../pages/vehicles/VehicleDetailsPage';
import { VehicleCreatePage } from '../pages/vehicles/VehicleCreatePage';
import { OrdersPage } from '../pages/orders/OrdersPage';
import { OrderDetailsPage } from '../pages/orders/OrderDetailsPage';
import { OrderCreatePage } from '../pages/orders/OrderCreatePage';
import { StaffPage } from '../pages/staff/StaffPage';
import { AdminCrmSettingsPage } from '../pages/admin/AdminCrmSettingsPage';
import { PartsWarehousePage } from '../pages/parts/PartsWarehousePage';
import { ThemeMode } from '../styles/theme';

const Loader = () => (
  <Stack minHeight="100vh" alignItems="center" justifyContent="center">
    <CircularProgress />
  </Stack>
);

interface AppProps {
  themeMode: ThemeMode;
  onToggleThemeMode: () => void;
}

export const App = ({ themeMode, onToggleThemeMode }: AppProps) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authStorage.getUser());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const user = await authApi.me(token);
        authStorage.setUser(user);
        setCurrentUser(user);
      } catch {
        authStorage.clear();
        setCurrentUser(null);
      } finally {
        setBooting(false);
      }
    };

    void bootstrap();
  }, []);

  const isAuthenticated = useMemo(() => Boolean(currentUser && authStorage.getToken()), [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (booting) {
    return <Loader />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setCurrentUser} isAuthenticated={isAuthenticated} />} />
      <Route
        element={
          isAuthenticated ? (
            <AppLayout currentUser={currentUser} onLogout={handleLogout} themeMode={themeMode} onToggleThemeMode={onToggleThemeMode} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<DashboardPage currentUser={currentUser} />} />
        <Route path="/customers" element={<CustomersPage currentUser={currentUser} />} />
        <Route path="/customers/:customerId" element={<CustomerDetailsPage currentUser={currentUser} />} />
        <Route path="/vehicles" element={<VehiclesPage currentUser={currentUser} />} />
        <Route path="/vehicles/new" element={<VehicleCreatePage />} />
        <Route path="/vehicles/:vehicleId" element={<VehicleDetailsPage currentUser={currentUser} />} />
        <Route path="/orders" element={<OrdersPage currentUser={currentUser} />} />
        <Route path="/orders/new" element={<OrderCreatePage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage currentUser={currentUser} />} />
        <Route path="/parts" element={<PartsWarehousePage currentUser={currentUser} />} />
        <Route path="/staff" element={<StaffPage currentUser={currentUser} />} />
        <Route path="/admin/crm-settings" element={<AdminCrmSettingsPage currentUser={currentUser} />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
};

import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TimeToLeaveRoundedIcon from '@mui/icons-material/TimeToLeaveRounded';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../auth/storage';
import { authApi } from '../api/authApi';
import { AuthUser, Role } from '../types/models';
import { hasAnyRole, roleLabel } from '../utils/roles';

const navConfig: Array<{ label: string; icon: JSX.Element; to: string; roles: Role[] }> = [
  { label: 'Главная', icon: <DashboardRoundedIcon />, to: '/', roles: ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST'] },
  { label: 'Клиенты', icon: <PeopleAltRoundedIcon />, to: '/customers', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'] },
  { label: 'Автомобили', icon: <TimeToLeaveRoundedIcon />, to: '/vehicles', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'] },
  { label: 'Заказы', icon: <ReceiptLongRoundedIcon />, to: '/orders', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'] },
  { label: 'Сотрудники', icon: <ShieldRoundedIcon />, to: '/staff', roles: ['ADMIN'] }
];

export const AppLayout = ({ currentUser, onLogout }: { currentUser: AuthUser | null; onLogout: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    const accessToken = authStorage.getToken();
    const refreshToken = authStorage.getRefreshToken();
    try {
      if (accessToken && refreshToken) {
        await authApi.logout(accessToken, refreshToken);
      }
    } catch {
      // ignore logout transport errors
    } finally {
      authStorage.clear();
      onLogout();
      navigate('/login', { replace: true });
    }
  };

  const sidebarItems = navConfig.filter((item) => hasAnyRole(currentUser?.roles, item.roles));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #E2E8F0' }}>
        <Toolbar sx={{ minHeight: '64px !important', px: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <DirectionsCarFilledRoundedIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6">AutoShop CRM</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography variant="body2">{currentUser?.email ?? 'Сотрудник'}</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="flex-end">
                {(currentUser?.roles ?? []).map((role) => (
                  <Chip key={role} label={roleLabel(role)} size="small" variant="outlined" />
                ))}
              </Stack>
            </Stack>
            <ListItemButton onClick={() => void logout()} sx={{ width: 'auto', borderRadius: 2 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ExitToAppRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Выйти" />
            </ListItemButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="aside" sx={{ width: 252, flexShrink: 0, borderRight: '1px solid #E2E8F0', bgcolor: 'background.paper', pt: '64px' }}>
        <List sx={{ p: 2 }}>
          {sidebarItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
              sx={{ borderRadius: 2, mb: 1 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
      </Box>

      <Box component="main" sx={{ flex: 1, pt: '64px' }}>
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

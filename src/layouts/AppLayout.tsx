import { ReactElement } from 'react';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
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
  Typography,
  useTheme
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../auth/storage';
import { authApi } from '../api/authApi';
import { AuthUser, Role } from '../types/models';
import { ThemeMode } from '../styles/theme';
import { ThemeToggle } from '../components/ThemeToggle';
import { hasAnyRole, roleLabel } from '../utils/roles';

const navConfig: Array<{ label: string; icon: ReactElement; to: string; roles: Role[] }> = [
  { label: 'Главная', icon: <DashboardRoundedIcon />, to: '/', roles: ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST'] },
  { label: 'Клиенты', icon: <PeopleAltRoundedIcon />, to: '/customers', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'] },
  { label: 'Автомобили', icon: <TimeToLeaveRoundedIcon />, to: '/vehicles', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'] },
  { label: 'Заказы', icon: <ReceiptLongRoundedIcon />, to: '/orders', roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'] },
  { label: 'Запчасти и потребности', icon: <BuildRoundedIcon />, to: '/parts', roles: ['ADMIN', 'MANAGER'] },
  { label: 'CRM-настройки', icon: <AdminPanelSettingsRoundedIcon />, to: '/admin/crm-settings', roles: ['ADMIN'] },
  { label: 'Сотрудники', icon: <ShieldRoundedIcon />, to: '/staff', roles: ['ADMIN'] }
];

interface AppLayoutProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  themeMode: ThemeMode;
  onToggleThemeMode: () => void;
}

export const AppLayout = ({ currentUser, onLogout, themeMode, onToggleThemeMode }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const logout = async () => {
    const accessToken = authStorage.getToken();
    const refreshToken = authStorage.getRefreshToken();
    try {
      if (accessToken && refreshToken) {
        await authApi.logout(accessToken, refreshToken);
      }
    } catch {
    } finally {
      authStorage.clear();
      onLogout();
      navigate('/login', { replace: true });
    }
  };

  const sidebarItems = navConfig.filter((item) => hasAnyRole(currentUser?.roles, item.roles));

  const isActiveItem = (to: string) => to === '/'
    ? location.pathname === '/'
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Toolbar sx={{ minHeight: '64px !important', px: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <DirectionsCarFilledRoundedIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6">AutoShop CRM</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeToggle themeMode={themeMode} onToggle={onToggleThemeMode} />
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

      <Box component="aside" sx={{ width: 252, flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', pt: '64px' }}>
        <List sx={{ p: 2 }}>
          {sidebarItems.map((item) => {
            const isActive = isActiveItem(item.to);

            return (
              <ListItemButton
                key={item.to}
                selected={isActive}
                onClick={() => navigate(item.to)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  px: 1.5,
                  py: 1.1,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  border: '1px solid transparent',
                  '& .MuiListItemIcon-root': {
                    minWidth: 40,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: 'transform 0.18s ease, color 0.18s ease'
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive ? 600 : 500,
                    transition: 'color 0.18s ease'
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderColor: 'divider',
                    boxShadow: theme.shadows[1]
                  },
                  '&:hover .MuiListItemIcon-root': {
                    transform: 'scale(1.12)',
                    color: 'primary.main'
                  },
                  '&:hover .MuiListItemText-primary': {
                    color: 'primary.main'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    borderColor: 'primary.main',
                    boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                    borderColor: 'primary.main',
                    boxShadow: `${theme.shadows[1]}, inset 3px 0 0 ${theme.palette.primary.main}`
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
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

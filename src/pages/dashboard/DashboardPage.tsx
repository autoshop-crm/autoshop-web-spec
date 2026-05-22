import { ReactElement } from 'react';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TimeToLeaveRoundedIcon from '@mui/icons-material/TimeToLeaveRounded';
import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '../../types/models';
import { hasAnyRole } from '../../utils/roles';

interface DashboardCardItem {
  title: string;
  value: string;
  icon: ReactElement;
  visible: boolean;
  to: string;
}

export const DashboardPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const cards: DashboardCardItem[] = [
    {
      title: 'Главная',
      value: 'Стартовая точка для рабочих сценариев AutoShop CRM',
      icon: <DashboardRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'MECHANIC', 'RECEPTIONIST']),
      to: '/'
    },
    {
      title: 'Клиенты',
      value: 'Поиск, создание и карточка клиента',
      icon: <PeopleAltRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST']),
      to: '/customers'
    },
    {
      title: 'Автомобили',
      value: 'VIN, список клиента и привязка машины',
      icon: <TimeToLeaveRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC']),
      to: '/vehicles'
    },
    {
      title: 'Заказы',
      value: 'Статусы, смета, детали, согласования и таймлайн',
      icon: <ReceiptLongRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC']),
      to: '/orders'
    },
    {
      title: 'Запчасти и потребности',
      value: 'Складские позиции и заказанные детали по активным заказам',
      icon: <BuildRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER']),
      to: '/parts'
    },
    {
      title: 'CRM-настройки',
      value: 'Каталог услуг и обзор настроек программы лояльности',
      icon: <AdminPanelSettingsRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN']),
      to: '/admin/crm-settings'
    },
    {
      title: 'Сотрудники',
      value: 'Справочник сотрудников и создание staff-пользователей',
      icon: <ShieldRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN']),
      to: '/staff'
    }
  ].filter((card) => card.visible);

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" gutterBottom>
          Главная
        </Typography>
        <Typography color="text.secondary">
          Все доступные разделы CRM собраны здесь в том же составе, что и в левом боковом меню.
        </Typography>
      </div>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, md: 4 }} key={card.title}>
            <Card
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                },
                '&:focus-within': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2
                },
                '&:hover .dashboard-card-details, &:focus-within .dashboard-card-details': {
                  maxHeight: 72,
                  opacity: 1,
                  marginTop: theme.spacing(1)
                },
                '&:hover .dashboard-card-icon-inner, &:focus-within .dashboard-card-icon-inner': {
                  transform: 'scale(1.12)'
                }
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.to)}
                sx={{
                  height: '100%',
                  alignItems: 'stretch',
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2
                  }
                }}
              >
                <CardContent sx={{ height: '100%' }}>
                  <Stack spacing={1.5} sx={{ height: '100%' }}>
                    <Box
                      className="dashboard-card-icon"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        flexShrink: 0
                      }}
                    >
                      <Box
                        className="dashboard-card-icon-inner"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transformOrigin: 'center center',
                          transition: 'transform 0.18s ease'
                        }}
                      >
                        {card.icon}
                      </Box>
                    </Box>
                    <Typography variant="h6">{card.title}</Typography>
                    <Typography
                      className="dashboard-card-details"
                      color="text.secondary"
                      sx={{
                        maxHeight: 0,
                        opacity: 0,
                        overflow: 'hidden',
                        mt: 0,
                        transition: 'max-height 0.22s ease, opacity 0.18s ease, margin-top 0.18s ease'
                      }}
                    >
                      {card.value}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

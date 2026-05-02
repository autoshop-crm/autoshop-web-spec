import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import TimeToLeaveRoundedIcon from '@mui/icons-material/TimeToLeaveRounded';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { AuthUser } from '../../types/models';
import { hasAnyRole } from '../../utils/roles';

export const DashboardPage = ({ currentUser }: { currentUser: AuthUser | null }) => {
  const cards = [
    {
      title: 'Клиенты',
      value: 'Поиск, создание и карточка клиента',
      icon: <PeopleAltRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST'])
    },
    {
      title: 'Автомобили',
      value: 'VIN, список клиента и привязка машины',
      icon: <TimeToLeaveRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'])
    },
    {
      title: 'Заказы',
      value: 'Статусы, смета, детали и файлы',
      icon: <ReceiptLongRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'])
    },
    {
      title: 'Loyalty',
      value: 'Баланс и списание баллов по заказу',
      icon: <StarRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN', 'MANAGER', 'RECEPTIONIST'])
    },
    {
      title: 'Сотрудники',
      value: 'Создание staff-пользователей',
      icon: <ShieldRoundedIcon color="primary" />,
      visible: hasAnyRole(currentUser?.roles, ['ADMIN'])
    }
  ].filter((card) => card.visible);

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" gutterBottom>
          Главная
        </Typography>
        <Typography color="text.secondary">
          Интерфейс работников AutoShop, подключённый к auth/core/files через gateway `8088`.
        </Typography>
      </div>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, md: 4 }} key={card.title}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  {card.icon}
                  <Typography variant="h6">{card.title}</Typography>
                  <Typography color="text.secondary">{card.value}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

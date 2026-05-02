import { Role } from '../types/models';

export const hasAnyRole = (roles: Role[] | undefined, allowed: Role[]) =>
  Boolean(roles?.some((role) => allowed.includes(role)));

export const roleLabel = (role: Role) => {
  const labels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    MECHANIC: 'Механик',
    RECEPTIONIST: 'Ресепшн',
    CLIENT: 'Клиент'
  };

  return labels[role] ?? role;
};

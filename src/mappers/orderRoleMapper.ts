import { Role } from '../types/models';

export type OrderActionKey =
  | 'assignEmployee'
  | 'updateEstimate'
  | 'updateStatus'
  | 'checkIn'
  | 'markNoShow'
  | 'createApproval'
  | 'approveRequest'
  | 'rejectRequest'
  | 'manageProcurement'
  | 'spendLoyalty';

const actionRoleMap: Record<OrderActionKey, Role[]> = {
  assignEmployee: ['ADMIN', 'MANAGER'],
  updateEstimate: ['ADMIN', 'MANAGER', 'MECHANIC'],
  updateStatus: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MECHANIC'],
  checkIn: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
  markNoShow: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
  createApproval: ['ADMIN', 'MANAGER', 'MECHANIC'],
  approveRequest: ['ADMIN', 'MANAGER'],
  rejectRequest: ['ADMIN', 'MANAGER'],
  manageProcurement: ['ADMIN', 'MANAGER'],
  spendLoyalty: ['ADMIN', 'MANAGER', 'RECEPTIONIST']
};

export const getVisibleOrderActionsForRoles = (roles: Role[] | undefined | null): OrderActionKey[] => {
  const roleSet = new Set(roles ?? []);
  return (Object.keys(actionRoleMap) as OrderActionKey[]).filter((action) => actionRoleMap[action].some((role) => roleSet.has(role)));
};

export const canRoleAccessOrderAction = (roles: Role[] | undefined | null, action: OrderActionKey): boolean => {
  const roleSet = new Set(roles ?? []);
  return actionRoleMap[action].some((role) => roleSet.has(role));
};

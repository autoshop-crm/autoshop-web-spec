import { LegacyOrderStatus, OrderCrmStatus, OrderStatus, Role } from '../types/models';

export const crmOrderStatuses: OrderCrmStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'WAITING_FOR_VISIT',
  'ACCEPTED',
  'DIAGNOSIS_IN_PROGRESS',
  'WAITING_FOR_OWNER_APPROVAL',
  'WAITING_FOR_PART',
  'REPAIR_IN_PROGRESS',
  'READY_FOR_OWNER',
  'HANDED_OVER',
  'CANCELLED_NO_SHOW',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_INTERNAL'
];

export const legacyOrderStatuses: LegacyOrderStatus[] = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const orderStatuses: OrderStatus[] = crmOrderStatuses;

const orderStatusLabels: Record<string, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  WAITING_FOR_VISIT: 'Ожидает визита',
  ACCEPTED: 'Автомобиль принят',
  DIAGNOSIS_IN_PROGRESS: 'Диагностика',
  WAITING_FOR_OWNER_APPROVAL: 'Ожидает согласования владельца',
  WAITING_FOR_PART: 'Ожидает запчасти',
  REPAIR_IN_PROGRESS: 'Ремонт в процессе',
  READY_FOR_OWNER: 'Готов к выдаче',
  HANDED_OVER: 'Выдан',
  CANCELLED_NO_SHOW: 'Отменён: клиент не приехал',
  CANCELLED_BY_CUSTOMER: 'Отменён клиентом',
  CANCELLED_INTERNAL: 'Отменён сервисом'
};

const orderStatusGroupLabels: Partial<Record<OrderCrmStatus, string>> = {
  WAITING_FOR_VISIT: 'Запись оформлена',
  ACCEPTED: 'Автомобиль принят',
  DIAGNOSIS_IN_PROGRESS: 'В работе',
  REPAIR_IN_PROGRESS: 'В работе',
  WAITING_FOR_OWNER_APPROVAL: 'Ожидает решения владельца',
  WAITING_FOR_PART: 'Ожидаем запчасти',
  READY_FOR_OWNER: 'Готов к выдаче',
  HANDED_OVER: 'Выдан',
  CANCELLED_NO_SHOW: 'Отменён',
  CANCELLED_BY_CUSTOMER: 'Отменён',
  CANCELLED_INTERNAL: 'Отменён'
};

const crmToLegacyStatusMap: Record<string, LegacyOrderStatus> = {
  NEW: 'NEW',
  WAITING_FOR_VISIT: 'NEW',
  ACCEPTED: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  DIAGNOSIS_IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_OWNER_APPROVAL: 'IN_PROGRESS',
  WAITING_FOR_PART: 'IN_PROGRESS',
  REPAIR_IN_PROGRESS: 'IN_PROGRESS',
  READY_FOR_OWNER: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  HANDED_OVER: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  CANCELLED_NO_SHOW: 'CANCELLED',
  CANCELLED_BY_CUSTOMER: 'CANCELLED',
  CANCELLED_INTERNAL: 'CANCELLED'
};

const orderStatusTones: Record<string, 'info' | 'warning' | 'success' | 'default' | 'error'> = {
  NEW: 'info',
  WAITING_FOR_VISIT: 'info',
  ACCEPTED: 'info',
  IN_PROGRESS: 'warning',
  DIAGNOSIS_IN_PROGRESS: 'warning',
  WAITING_FOR_OWNER_APPROVAL: 'warning',
  WAITING_FOR_PART: 'warning',
  REPAIR_IN_PROGRESS: 'warning',
  READY_FOR_OWNER: 'success',
  COMPLETED: 'success',
  HANDED_OVER: 'success',
  CANCELLED: 'error',
  CANCELLED_NO_SHOW: 'error',
  CANCELLED_BY_CUSTOMER: 'error',
  CANCELLED_INTERNAL: 'error'
};

export const getOrderStatusLabel = (status: OrderStatus) => orderStatusLabels[status] ?? status;

export const getOrderStatusGroupLabel = (status: OrderCrmStatus) => orderStatusGroupLabels[status] ?? getOrderStatusLabel(status);

export const getOrderStatusTone = (status: OrderStatus) => orderStatusTones[status] ?? 'default';

export const toLegacyOrderStatus = (status: OrderStatus): LegacyOrderStatus => crmToLegacyStatusMap[status] ?? 'NEW';


const orderStatusTransitionMap: Partial<Record<OrderCrmStatus, OrderCrmStatus[]>> = {
  WAITING_FOR_VISIT: ['ACCEPTED', 'CANCELLED_NO_SHOW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_INTERNAL'],
  ACCEPTED: ['DIAGNOSIS_IN_PROGRESS', 'REPAIR_IN_PROGRESS', 'CANCELLED_INTERNAL'],
  DIAGNOSIS_IN_PROGRESS: ['WAITING_FOR_OWNER_APPROVAL', 'WAITING_FOR_PART', 'REPAIR_IN_PROGRESS', 'READY_FOR_OWNER', 'CANCELLED_INTERNAL'],
  WAITING_FOR_OWNER_APPROVAL: ['DIAGNOSIS_IN_PROGRESS', 'REPAIR_IN_PROGRESS', 'READY_FOR_OWNER', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_INTERNAL'],
  WAITING_FOR_PART: ['REPAIR_IN_PROGRESS', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_INTERNAL'],
  REPAIR_IN_PROGRESS: ['WAITING_FOR_OWNER_APPROVAL', 'WAITING_FOR_PART', 'READY_FOR_OWNER', 'CANCELLED_INTERNAL'],
  READY_FOR_OWNER: ['HANDED_OVER', 'CANCELLED_INTERNAL'],
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED']
};

const orderStatusRoleTargetMap: Partial<Record<Role, OrderCrmStatus[]>> = {
  ADMIN: crmOrderStatuses,
  MANAGER: ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'WAITING_FOR_VISIT', 'ACCEPTED', 'DIAGNOSIS_IN_PROGRESS', 'WAITING_FOR_OWNER_APPROVAL', 'WAITING_FOR_PART', 'REPAIR_IN_PROGRESS', 'READY_FOR_OWNER', 'HANDED_OVER', 'CANCELLED_NO_SHOW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_INTERNAL'],
  MECHANIC: ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DIAGNOSIS_IN_PROGRESS', 'REPAIR_IN_PROGRESS', 'READY_FOR_OWNER', 'WAITING_FOR_OWNER_APPROVAL'],
  RECEPTIONIST: ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ACCEPTED', 'HANDED_OVER', 'CANCELLED_NO_SHOW']
};

export const getAllowedOrderStatusTargets = (role: Role, currentStatus?: OrderStatus | null): OrderCrmStatus[] => {
  const roleTargets = new Set(orderStatusRoleTargetMap[role] ?? orderStatusRoleTargetMap.ADMIN ?? []);
  const normalizedCurrentStatus = (currentStatus ?? 'WAITING_FOR_VISIT') as OrderCrmStatus;
  const stateTargets = orderStatusTransitionMap[normalizedCurrentStatus] ?? [];
  return stateTargets.filter((status) => roleTargets.has(status));
};

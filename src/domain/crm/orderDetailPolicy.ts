import { OrderCrmStatus, Role } from '../../types/models';
import { canRoleAccessOrderAction, OrderActionKey } from '../../mappers/orderRoleMapper';

export type OrderDetailSectionKey =
  | 'header'
  | 'customerVehicle'
  | 'orderedWorks'
  | 'mechanicWorkspace'
  | 'partsWorkspace'
  | 'financialSummary'
  | 'approvals'
  | 'loyalty'
  | 'files'
  | 'timeline';

export type PolicyConfidence = 'confirmed' | 'provisional' | 'open';
export type AccessLevel = 'hidden' | 'read-only' | 'editable' | 'actionable';

export interface OrderSectionPolicy {
  key: OrderDetailSectionKey;
  visible: boolean;
  access: AccessLevel;
  confidence: PolicyConfidence;
}

export interface OrderActionPolicy {
  key: OrderActionKey;
  visible: boolean;
  enabled: boolean;
  confidence: PolicyConfidence;
}

export interface FinancialCapabilities {
  viewSummary: boolean;
  editEstimate: boolean;
  editDiscount: boolean;
  spendLoyalty: boolean;
}

export interface ProcurementCapabilities {
  viewWorkspace: boolean;
  requestParts: boolean;
  manageQuotes: boolean;
  orderParts: boolean;
  receiveParts: boolean;
}

export interface OrderPolicyState {
  crmStatus?: OrderCrmStatus | null;
  loyaltyVisible?: boolean;
  loyaltyEnabled?: boolean;
}

const rolePrioritySections: Record<Role, OrderDetailSectionKey[]> = {
  ADMIN: ['header', 'customerVehicle', 'orderedWorks', 'mechanicWorkspace', 'partsWorkspace', 'financialSummary', 'approvals', 'loyalty', 'files', 'timeline'],
  MANAGER: ['header', 'customerVehicle', 'orderedWorks', 'partsWorkspace', 'financialSummary', 'approvals', 'loyalty', 'files', 'timeline', 'mechanicWorkspace'],
  MECHANIC: ['header', 'customerVehicle', 'orderedWorks', 'mechanicWorkspace', 'partsWorkspace', 'approvals', 'files', 'timeline', 'financialSummary', 'loyalty'],
  RECEPTIONIST: ['header', 'customerVehicle', 'orderedWorks', 'partsWorkspace', 'financialSummary', 'approvals', 'loyalty', 'files', 'timeline', 'mechanicWorkspace']
};

export const getOrderDetailSectionsForRole = (role: Role, state: OrderPolicyState = {}): OrderSectionPolicy[] => {
  const orderedKeys = rolePrioritySections[role] ?? rolePrioritySections.ADMIN;

  return orderedKeys.map((key) => {
    if (key === 'mechanicWorkspace') {
      if (role === 'RECEPTIONIST') {
        return { key, visible: false, access: 'hidden', confidence: 'provisional' };
      }
      return {
        key,
        visible: role === 'ADMIN' || role === 'MECHANIC',
        access: role === 'MECHANIC' || role === 'ADMIN' ? 'editable' : 'hidden',
        confidence: 'provisional'
      };
    }

    if (key === 'financialSummary') {
      return {
        key,
        visible: true,
        access: role === 'ADMIN' || role === 'MANAGER' ? 'editable' : 'read-only',
        confidence: 'provisional'
      };
    }

    if (key === 'approvals') {
      return {
        key,
        visible: true,
        access: role === 'ADMIN' || role === 'MANAGER' || role === 'MECHANIC' ? 'actionable' : 'read-only',
        confidence: 'confirmed'
      };
    }

    if (key === 'loyalty') {
      const visible = Boolean(state.loyaltyVisible ?? true);
      const editable = visible && (role === 'ADMIN' || role === 'MANAGER' || role === 'RECEPTIONIST') && Boolean(state.loyaltyEnabled ?? true);
      return {
        key,
        visible,
        access: !visible ? 'hidden' : editable ? 'actionable' : 'read-only',
        confidence: 'confirmed'
      };
    }

    if (key === 'partsWorkspace') {
      return {
        key,
        visible: true,
        access: role === 'ADMIN' || role === 'MANAGER' || role === 'MECHANIC' ? 'actionable' : 'read-only',
        confidence: 'confirmed'
      };
    }

    if (key === 'timeline') {
      return {
        key,
        visible: true,
        access: 'read-only',
        confidence: role === 'RECEPTIONIST' ? 'provisional' : 'confirmed'
      };
    }

    return { key, visible: true, access: 'read-only', confidence: 'confirmed' };
  });
};

export const getOrderActionsForRole = (role: Role, state: OrderPolicyState = {}): OrderActionPolicy[] => {
  const actions: OrderActionKey[] = [
    'assignEmployee',
    'updateEstimate',
    'updateStatus',
    'checkIn',
    'markNoShow',
    'createApproval',
    'approveRequest',
    'rejectRequest',
    'manageProcurement',
    'spendLoyalty'
  ];

  return actions.map((key) => {
    const visible = canRoleAccessOrderAction([role], key);
    const enabled = key === 'spendLoyalty' ? visible && Boolean(state.loyaltyEnabled ?? true) && Boolean(state.loyaltyVisible ?? true) : visible;
    return {
      key,
      visible,
      enabled,
      confidence: key === 'approveRequest' || key === 'rejectRequest' ? 'confirmed' : key === 'checkIn' || key === 'markNoShow' ? 'confirmed' : 'provisional'
    };
  });
};

export const getFinancialCapabilities = (role: Role, state: OrderPolicyState = {}): FinancialCapabilities => ({
  viewSummary: role === 'ADMIN' || role === 'MANAGER' || role === 'MECHANIC' || role === 'RECEPTIONIST',
  editEstimate: role === 'ADMIN' || role === 'MANAGER',
  editDiscount: role === 'ADMIN' || role === 'MANAGER',
  spendLoyalty: (role === 'ADMIN' || role === 'MANAGER' || role === 'RECEPTIONIST') && Boolean(state.loyaltyVisible ?? true) && Boolean(state.loyaltyEnabled ?? true)
});

export const getProcurementCapabilities = (role: Role): ProcurementCapabilities => ({
  viewWorkspace: role === 'ADMIN' || role === 'MANAGER' || role === 'MECHANIC' || role === 'RECEPTIONIST',
  requestParts: role === 'ADMIN' || role === 'MANAGER' || role === 'MECHANIC',
  manageQuotes: role === 'ADMIN' || role === 'MANAGER',
  orderParts: role === 'ADMIN' || role === 'MANAGER',
  receiveParts: role === 'ADMIN' || role === 'MANAGER'
});

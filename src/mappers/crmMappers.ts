import {
  ApprovalRequestDTO,
  ApprovalRequestStatus,
  ApprovalRequestViewModel,
  LoyaltySettingsDTO,
  LoyaltySettingsViewModel,
  Order,
  OrderCrmStatus,
  OrderDetailViewModel,
  OrderListItemViewModel,
  OrderQueueSummaryDTO,
  RequestedPartViewModel,
  OrderRequestedPart,
  TimelineEntryViewModel,
  OrderTimelineEntryResponseDTO,
  Customer,
  Vehicle
} from '../types/models';
import { getOrderStatusGroupLabel, getOrderStatusLabel, toLegacyOrderStatus } from '../utils/orderStatus';

const approvalStatusLabels: Record<string, string> = {
  OPEN: 'Ожидает решения',
  APPROVED: 'Согласовано',
  REJECTED: 'Отклонено',
  EXPIRED: 'Истекло',
  CANCELLED: 'Отменено'
};

export const getApprovalStatusLabel = (status: ApprovalRequestStatus) => approvalStatusLabels[status] ?? status;

export const mapOrderToListItemViewModel = (order: Order): OrderListItemViewModel => {
  const crmStatus = (order.crmStatus ?? order.status) as OrderCrmStatus;
  return {
    id: order.id,
    customerId: order.customerId,
    vehicleId: order.vehicleId,
    employeeId: order.employeeId ?? null,
    problem: order.problem,
    crmStatus,
    legacyStatus: order.legacyStatus ?? toLegacyOrderStatus(crmStatus),
    statusLabel: getOrderStatusLabel(crmStatus),
    statusGroupLabel: getOrderStatusGroupLabel(crmStatus),
    plannedVisitAt: order.plannedVisitAt ?? null,
    finalAmount: order.finalAmount ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
};

export const mapRequestedPartToViewModel = (part: OrderRequestedPart): RequestedPartViewModel => ({
  id: part.id,
  articleNumber: part.articleNumber,
  brand: part.brand ?? null,
  name: part.name,
  quantity: part.requestedQuantity,
  status: part.status,
  statusLabel: part.status,
  purchasePrice: part.purchasePrice ?? null,
  salePrice: part.salePrice ?? null,
  selectedSupplier: part.selectedSupplier ?? null,
  orderedAt: part.orderedAt ?? null,
  receivedAt: part.receivedAt ?? null
});

export const mapTimelineEntryToViewModel = (entry: OrderTimelineEntryResponseDTO): TimelineEntryViewModel => ({
  id: entry.id,
  eventType: entry.eventType,
  title: entry.summary ?? entry.title ?? entry.eventType,
  description: entry.description ?? null,
  detailsJson: entry.detailsJson ?? null,
  actorDisplayName: entry.actorDisplayName ?? entry.actorType ?? null,
  createdAt: entry.occurredAt ?? entry.createdAt ?? ''
});

export const mapApprovalRequestToViewModel = (approval: ApprovalRequestDTO): ApprovalRequestViewModel => ({
  id: approval.requestId,
  status: approval.requestStatus,
  statusLabel: getApprovalStatusLabel(approval.requestStatus),
  title: approval.title ?? null,
  description: approval.description ?? null,
  laborAmount: approval.laborAmount ?? null,
  partsAmount: approval.partsAmount ?? null,
  totalAmount: approval.totalAmount ?? null,
  requestedByDisplayName: null,
  createdAt: approval.requestedAt,
  expiresAt: approval.expiresAt ?? null,
  decidedAt: null
});

export const mapLoyaltySettingsToViewModel = (settings: LoyaltySettingsDTO): LoyaltySettingsViewModel => ({
  enabled: settings.enabled,
  visible: settings.visible,
  spendEnabled: settings.spendEnabled,
  earnEnabled: settings.earnEnabled,
  statusLabel: settings.enabled ? 'Loyalty включена' : 'Loyalty выключена'
});

export const mapOrderDetailToViewModel = (params: {
  order: Order;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  requestedParts?: OrderRequestedPart[];
  approvals?: ApprovalRequestDTO[];
  timeline?: OrderTimelineEntryResponseDTO[];
  loyaltySettings?: LoyaltySettingsDTO | null;
}): OrderDetailViewModel => ({
  order: params.order,
  crmStatus: (params.order.crmStatus ?? params.order.status) as OrderCrmStatus,
  legacyStatus: params.order.legacyStatus ?? toLegacyOrderStatus(params.order.crmStatus ?? params.order.status),
  customer: params.customer ?? null,
  vehicle: params.vehicle ?? null,
  serviceLines: params.order.serviceLines ?? [],
  requestedParts: (params.requestedParts ?? []).map(mapRequestedPartToViewModel),
  approvals: (params.approvals ?? []).map(mapApprovalRequestToViewModel),
  timeline: (params.timeline ?? []).map(mapTimelineEntryToViewModel),
  loyaltySettings: params.loyaltySettings ? mapLoyaltySettingsToViewModel(params.loyaltySettings) : null
});

export const mapCrmOrderSearchResponse = (response: { items: Order[]; page: number; size: number; hasMore: boolean; totalElements?: number | null; loyaltySettings?: LoyaltySettingsDTO | null; }) => ({
  items: response.items.map(mapOrderToListItemViewModel),
  page: response.page,
  size: response.size,
  hasMore: response.hasMore,
  totalElements: response.totalElements ?? null,
  loyaltySettings: response.loyaltySettings ? mapLoyaltySettingsToViewModel(response.loyaltySettings) : null
});

export const mapQueueSummary = (summary: OrderQueueSummaryDTO) => ({
  waitingForVisit: summary.waitingForVisit ?? 0,
  accepted: summary.accepted ?? 0,
  diagnosisInProgress: summary.diagnosisInProgress ?? 0,
  waitingForOwnerApproval: summary.waitingForOwnerApproval ?? 0,
  waitingForPart: summary.waitingForPart ?? 0,
  repairInProgress: summary.repairInProgress ?? 0,
  readyForOwner: summary.readyForOwner ?? 0
});

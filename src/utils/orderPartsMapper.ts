import { OrderPartsOverviewItem, RequestedPartStatus } from '../types/models';

export type OrderPartDisplayStatus = 'REQUESTED' | 'WAITING_APPROVAL' | 'APPROVED_WAITING_ORDER' | 'IN_TRANSIT' | 'IN_STOCK' | 'INSTALLED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'OUT_OF_STOCK';

export interface AggregatedOrderPartsItem {
  itemType: 'LOCAL' | 'REQUESTED' | 'MIXED';
  key: string;
  articleNumber: string;
  brand: string | null;
  name: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  availableLocally: boolean;
  requestedStatus: RequestedPartStatus | null;
  displayStatus: OrderPartDisplayStatus;
  displayStatusLabel: string;
  localPartId: number | null;
  overviewItems: OrderPartsOverviewItem[];
  requestedPartIds: number[];
}

export const getRequestedStatusLabel = (status: RequestedPartStatus | null | undefined) => {
  switch (status) {
    case 'REQUESTED_BY_MECHANIC':
      return 'Запрошена механиком';
    case 'WAITING_CLIENT_APPROVAL':
      return 'На согласовании';
    case 'APPROVED_WAITING_ORDER':
      return 'Одобрена, ждёт заказа';
    case 'CLIENT_REJECTED':
      return 'Отклонена клиентом';
    case 'QUOTE_EXPIRED':
      return 'Предложение устарело';
    case 'INSTALLED':
      return 'Установлена';
    case 'CANCELLED':
      return 'Отменена';
    case 'IN_STOCK_RESERVED':
      return 'На складе';
    case 'ORDERED_IN_TRANSIT':
      return 'В пути';
    case 'OUT_OF_STOCK':
      return 'Запрошена';
    default:
      return '—';
  }
};

export const getOverviewDisplayStatus = (item: OrderPartsOverviewItem): OrderPartDisplayStatus => {
  if (item.itemType === 'LOCAL') return 'IN_STOCK';
  switch (item.requestedStatus) {
    case 'REQUESTED_BY_MECHANIC':
    case 'OUT_OF_STOCK':
      return 'REQUESTED';
    case 'WAITING_CLIENT_APPROVAL':
      return 'WAITING_APPROVAL';
    case 'APPROVED_WAITING_ORDER':
      return 'APPROVED_WAITING_ORDER';
    case 'IN_STOCK_RESERVED':
      return 'IN_STOCK';
    case 'INSTALLED':
      return 'INSTALLED';
    case 'ORDERED_IN_TRANSIT':
      return 'IN_TRANSIT';
    case 'CLIENT_REJECTED':
      return 'REJECTED';
    case 'QUOTE_EXPIRED':
      return 'EXPIRED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'OUT_OF_STOCK';
  }
};

const statusPriority: Record<OrderPartDisplayStatus, number> = {
  IN_TRANSIT: 8,
  APPROVED_WAITING_ORDER: 7,
  WAITING_APPROVAL: 6,
  REQUESTED: 5,
  IN_STOCK: 4,
  INSTALLED: 3,
  EXPIRED: 2,
  REJECTED: 1,
  CANCELLED: 1,
  OUT_OF_STOCK: 0
};

export const getDisplayStatusLabel = (status: OrderPartDisplayStatus) => {
  switch (status) {
    case 'REQUESTED':
      return 'Запрошена';
    case 'WAITING_APPROVAL':
      return 'На согласовании';
    case 'APPROVED_WAITING_ORDER':
      return 'Одобрена, ждёт заказа';
    case 'IN_TRANSIT':
      return 'В пути';
    case 'IN_STOCK':
      return 'На складе';
    case 'INSTALLED':
      return 'Установлена';
    case 'REJECTED':
      return 'Отклонена';
    case 'EXPIRED':
      return 'Предложение устарело';
    case 'CANCELLED':
      return 'Отменена';
    default:
      return 'Нет на складе';
  }
};

export const aggregateOverviewItems = (items: OrderPartsOverviewItem[]) => {
  const groups = new Map<string, OrderPartsOverviewItem[]>();

  items.forEach((item) => {
    const key = (item.articleNumber || `${item.itemType}-${item.id}`).toUpperCase();
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([key, group]) => {
    const first = group[0];
    const quantity = group.reduce((sum, item) => sum + item.quantity, 0);
    const lineTotal = group.reduce<number | null>((sum, item) => {
      if (item.lineTotal == null) return sum;
      return (sum ?? 0) + Number(item.lineTotal);
    }, null);
    const unitPriceCandidate = [...group].reverse().find((item) => item.unitPrice != null)?.unitPrice ?? null;
    const displayStatus = group
      .map((item) => getOverviewDisplayStatus(item))
      .sort((left, right) => statusPriority[right] - statusPriority[left])[0] ?? 'OUT_OF_STOCK';
    const requestedStatus = group.find((item) => item.requestedStatus)?.requestedStatus ?? null;
    const itemType = group.some((item) => item.itemType === 'REQUESTED') && group.some((item) => item.itemType === 'LOCAL')
      ? 'MIXED'
      : (group.some((item) => item.itemType === 'REQUESTED') ? 'REQUESTED' : 'LOCAL');

    return {
      itemType,
      key,
      articleNumber: first.articleNumber,
      brand: first.brand ?? null,
      name: first.name,
      quantity,
      unitPrice: unitPriceCandidate != null ? Number(unitPriceCandidate) : null,
      lineTotal,
      availableLocally: group.some((item) => item.availableLocally),
      requestedStatus,
      displayStatus,
      displayStatusLabel: getDisplayStatusLabel(displayStatus),
      localPartId: group.find((item) => item.localPartId != null)?.localPartId ?? null,
      overviewItems: group,
      requestedPartIds: group.filter((item) => item.itemType === 'REQUESTED').map((item) => item.id)
    } satisfies AggregatedOrderPartsItem;
  }).sort((left, right) => left.name.localeCompare(right.name, 'ru'));
};

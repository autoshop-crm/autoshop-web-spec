import { OrderPartsOverviewItem, RequestedPartStatus } from '../types/models';

export type OrderPartDisplayStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'IN_TRANSIT';

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
    case 'IN_STOCK_RESERVED':
      return 'На складе';
    case 'ORDERED_IN_TRANSIT':
      return 'В пути';
    case 'OUT_OF_STOCK':
      return 'Нет на складе';
    default:
      return '—';
  }
};

export const getOverviewDisplayStatus = (item: OrderPartsOverviewItem): OrderPartDisplayStatus => {
  if (item.itemType === 'LOCAL') return 'IN_STOCK';
  switch (item.requestedStatus) {
    case 'IN_STOCK_RESERVED':
      return 'IN_STOCK';
    case 'ORDERED_IN_TRANSIT':
      return 'IN_TRANSIT';
    case 'OUT_OF_STOCK':
    default:
      return 'OUT_OF_STOCK';
  }
};

const statusPriority: Record<OrderPartDisplayStatus, number> = {
  IN_TRANSIT: 3,
  IN_STOCK: 2,
  OUT_OF_STOCK: 1
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
      displayStatusLabel: displayStatus === 'IN_STOCK' ? 'На складе' : displayStatus === 'IN_TRANSIT' ? 'В пути' : 'Нет на складе',
      localPartId: group.find((item) => item.localPartId != null)?.localPartId ?? null,
      overviewItems: group,
      requestedPartIds: group.filter((item) => item.itemType === 'REQUESTED').map((item) => item.id)
    } satisfies AggregatedOrderPartsItem;
  }).sort((left, right) => left.name.localeCompare(right.name, 'ru'));
};

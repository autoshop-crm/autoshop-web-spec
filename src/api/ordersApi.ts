import { http } from './http';
import {
  LegacyOrderStatus,
  LoyaltySettingsDTO,
  Order,
  OrderBookingChannel,
  OrderCrmStatus,
  OrderPartItem,
  OrderQueueSummaryDTO,
  OrderSearchResponseDTO,
  OrderStatus
} from '../types/models';

export interface OrderCreatePayload {
  customerId: number;
  vehicleId: number;
  employeeId?: number | null;
  problem: string;
  plannedVisitAt?: string | null;
  plannedSlotMinutes?: number | null;
  bookingChannel?: OrderBookingChannel | null;
  intakeNotes?: string | null;
  selectedServiceIds?: number[];
  immediateDropOff?: boolean;
  requiresOwnerApprovalForEveryExtraWork?: boolean;
}

export interface OrderUpdatePayload {
  problem?: string;
  plannedVisitAt?: string | null;
  plannedSlotMinutes?: number | null;
  bookingChannel?: OrderBookingChannel | null;
  intakeNotes?: string | null;
  employeeId?: number | null;
  requiresOwnerApprovalForEveryExtraWork?: boolean | null;
}

export interface CrmOrderSearchParams {
  customerId?: number;
  vehicleId?: number;
  status?: OrderCrmStatus | LegacyOrderStatus;
  employeeId?: number;
  plannedFrom?: string;
  plannedTo?: string;
  q?: string;
  page?: number;
  size?: number;
}

export interface BookingRangeParams {
  from?: string;
  to?: string;
}

export interface BookingDateParams {
  date: string;
}

export interface CrmOrderSearchResult {
  items: Order[];
  page: number;
  size: number;
  hasMore: boolean;
  totalElements?: number | null;
  loyaltySettings?: LoyaltySettingsDTO | null;
}

export const ordersApi = {
  getById: async (id: string | number) => {
    const { data } = await http.get<Order>(`/api/orders/${id}`);
    return data;
  },
  getByCustomerId: async (customerId: string | number) => {
    const { data } = await http.get<Order[]>(`/api/orders/customer/${customerId}`);
    return data;
  },
  getByVehicleId: async (vehicleId: string | number) => {
    const { data } = await http.get<Order[]>(`/api/orders/vehicle/${vehicleId}`);
    return data;
  },
  getByStatus: async (status: OrderStatus) => {
    const { data } = await http.get<Order[]>(`/api/orders/status/${status}`);
    return data;
  },
  getMyOrders: async () => {
    const { data } = await http.get<Order[]>('/api/orders/my');
    return data;
  },
  searchCrmOrders: async (params: CrmOrderSearchParams) => {
    const { data } = await http.get<OrderSearchResponseDTO>('/api/crm/orders/search', { params });
    return data;
  },
  getQueueSummary: async () => {
    const { data } = await http.get<OrderQueueSummaryDTO>('/api/crm/orders/queue-summary');
    return data;
  },
  create: async (payload: OrderCreatePayload) => {
    const { data } = await http.post<Order>('/api/orders', payload);
    return data;
  },
  createDropOff: async (payload: OrderCreatePayload) => {
    const { data } = await http.post<Order>('/api/orders/drop-off', payload);
    return data;
  },
  updateOrder: async (id: number, payload: OrderUpdatePayload) => {
    const { data } = await http.put<Order>(`/api/orders/${id}`, payload);
    return data;
  },
  updateStatus: async (id: number, status: OrderStatus) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/status`, { status });
    return data;
  },
  checkInOrder: async (id: number) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/check-in`);
    return data;
  },
  markNoShow: async (id: number) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/no-show`);
    return data;
  },
  getBookings: async (params: BookingRangeParams) => {
    const { data } = await http.get<Order[]>('/api/orders/bookings', { params });
    return data;
  },
  getDailyBookings: async (params: BookingDateParams) => {
    const { data } = await http.get<Order[]>('/api/orders/bookings/daily', { params });
    return data;
  },
  getUnassignedBookings: async (params: BookingDateParams) => {
    const { data } = await http.get<Order[]>('/api/orders/bookings/unassigned', { params });
    return data;
  },
  updateEstimate: async (id: number, laborTotal: number, discountAmount: number) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/estimate`, { laborTotal, discountAmount });
    return data;
  },
  assignEmployee: async (id: number, employeeId: number) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/assign`, { employeeId });
    return data;
  },
  getParts: async (orderId: number) => {
    const { data } = await http.get<OrderPartItem[]>(`/api/orders/${orderId}/parts`);
    return data;
  },
  addPart: async (orderId: number, partId: number, quantity: number) => {
    const { data } = await http.post<OrderPartItem>(`/api/orders/${orderId}/parts`, { partId, quantity });
    return data;
  },
  updatePart: async (orderId: number, itemId: number, quantity: number) => {
    const { data } = await http.put<OrderPartItem>(`/api/orders/${orderId}/parts/${itemId}`, { quantity });
    return data;
  },
  deletePart: async (orderId: number, itemId: number) => {
    await http.delete(`/api/orders/${orderId}/parts/${itemId}`);
  },
  spendLoyalty: async (orderId: number, points: number) => {
    const { data } = await http.put<Order>(`/api/orders/${orderId}/loyalty/spend`, { points });
    return data;
  },
  removeLoyalty: async (orderId: number) => {
    const { data } = await http.delete<Order>(`/api/orders/${orderId}/loyalty/spend`);
    return data;
  }
};

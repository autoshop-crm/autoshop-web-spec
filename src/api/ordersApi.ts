import { http } from './http';
import { Order, OrderPartItem, OrderStatus } from '../types/models';

export interface OrderCreatePayload {
  customerId: number;
  vehicleId: number;
  employeeId?: number | null;
  problem: string;
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
  create: async (payload: OrderCreatePayload) => {
    const { data } = await http.post<Order>('/api/orders', payload);
    return data;
  },
  updateStatus: async (id: number, status: OrderStatus) => {
    const { data } = await http.put<Order>(`/api/orders/${id}/status`, { status });
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

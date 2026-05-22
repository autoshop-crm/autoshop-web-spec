import { http } from './http';
import { OrderTimelineEntryResponseDTO } from '../types/models';

export const orderTimelineApi = {
  getByOrderId: async (orderId: number) => {
    const { data } = await http.get<OrderTimelineEntryResponseDTO[]>(`/api/orders/${orderId}/timeline`);
    return data;
  },
  getCustomerTimelineByOrderId: async (orderId: number) => {
    const { data } = await http.get<OrderTimelineEntryResponseDTO[]>(`/api/orders/${orderId}/timeline/customer`);
    return data;
  }
};

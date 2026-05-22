import { http } from './http';
import { ApprovalDecisionDTO, ApprovalRequestCreateDTO, ApprovalRequestDTO } from '../types/models';

export const orderApprovalApi = {
  listByOrderId: async (orderId: number) => {
    const { data } = await http.get<ApprovalRequestDTO[]>(`/api/orders/${orderId}/approvals`);
    return data;
  },
  create: async (orderId: number, payload: ApprovalRequestCreateDTO) => {
    const { data } = await http.post<ApprovalRequestDTO>(`/api/orders/${orderId}/approvals`, payload);
    return data;
  },
  approve: async (orderId: number, requestId: number, payload: ApprovalDecisionDTO) => {
    const { data } = await http.post<ApprovalRequestDTO>(`/api/orders/${orderId}/approvals/${requestId}/approve`, payload);
    return data;
  },
  reject: async (orderId: number, requestId: number, payload: ApprovalDecisionDTO) => {
    const { data } = await http.post<ApprovalRequestDTO>(`/api/orders/${orderId}/approvals/${requestId}/reject`, payload);
    return data;
  }
};

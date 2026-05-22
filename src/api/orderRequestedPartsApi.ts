import { http } from './http';
import { OrderPartsOverviewResponse, OrderRequestedPart, OrderRequestedPartQuote, OrderRequestedPartQuotesResponse } from '../types/models';

export interface CreateRequestedPartPayload {
  articleNumber: string;
  brand?: string | null;
  name: string;
  umapiArticleId?: number | null;
  matchedLocalPartId?: number | null;
  quantity: number;
}

export interface OrderRequestedPartOrderPayload {
  quote: {
    positionSignature?: string | null;
    articleNumber: string;
    brand?: string | null;
    name?: string | null;
    purchasePrice: number;
    deliveryDaysMin?: number | null;
    deliveryDaysMax?: number | null;
    minOrderQuantity?: number | null;
    quantityRaw?: string | null;
  };
  salePrice: number;
  createExternalOrder?: boolean;
  clientComment?: string;
}

export interface ReceiveRequestedPartPayload {
  targetPartId?: number | null;
  brand?: string | null;
  name?: string;
  receivedQuantity: number;
  salePrice?: number | null;
}

export const orderRequestedPartsApi = {
  create: async (orderId: number, payload: CreateRequestedPartPayload) => {
    const { data } = await http.post<OrderRequestedPart>(`/api/orders/${orderId}/requested-parts`, payload);
    return data;
  },
  listByOrderId: async (orderId: number) => {
    const { data } = await http.get<OrderRequestedPart[]>(`/api/orders/${orderId}/requested-parts`);
    return data;
  },
  getQuotes: async (orderId: number, requestedPartId: number) => {
    const { data } = await http.get<OrderRequestedPartQuotesResponse>(`/api/orders/${orderId}/requested-parts/${requestedPartId}/quotes`);
    return data;
  },
  order: async (orderId: number, requestedPartId: number, payload: OrderRequestedPartOrderPayload) => {
    const { data } = await http.post<OrderRequestedPart>(`/api/orders/${orderId}/requested-parts/${requestedPartId}/order`, payload);
    return data;
  },
  receive: async (orderId: number, requestedPartId: number, payload: ReceiveRequestedPartPayload) => {
    const { data } = await http.post<OrderRequestedPart>(`/api/orders/${orderId}/requested-parts/${requestedPartId}/receive`, payload);
    return data;
  },
  getOverview: async (orderId: number) => {
    const { data } = await http.get<OrderPartsOverviewResponse>(`/api/orders/${orderId}/parts/overview`);
    return data;
  }
};

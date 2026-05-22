import { http } from './http';
import { CatalogManufacturer, CatalogModelSeries, CatalogModification, Part, UnifiedPartSearchResponse, VehicleScopedPartSearchResponse } from '../types/models';

export interface PartsSearchParams {
  articleNumber?: string;
  brand?: string;
  name?: string;
  availableOnly?: boolean;
}

export interface UnifiedPartsSearchParams {
  articleNumber: string;
  brand?: string;
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const partsApi = {
  search: async (params: PartsSearchParams) => {
    const { data } = await http.get<Part[]>('/api/parts', { params });
    return data;
  },
  unifiedSearch: async (params: UnifiedPartsSearchParams) => {
    const { data } = await http.get<UnifiedPartSearchResponse>('/api/parts/unified/search', { params });
    return data;
  },
  searchByOrderVehicleName: async (orderId: number, params: { query: string; availableOnly?: boolean; limit?: number; offset?: number }) => {
    const { data } = await http.get<VehicleScopedPartSearchResponse>(`/api/orders/${orderId}/parts/search-by-name`, { params });
    return data;
  },
  getManufacturers: async (params?: { type?: string; popular?: boolean }) => {
    const { data } = await http.get<CatalogManufacturer[]>('/api/parts/catalog/manufacturers', { params });
    return data;
  },
  getModelSeries: async (params: { type?: string; manufacturerId: number }) => {
    const { data } = await http.get<CatalogModelSeries[]>('/api/parts/catalog/model-series', { params });
    return data;
  },
  getModifications: async (params: { type?: string; modelSeriesId: number }) => {
    const { data } = await http.get<CatalogModification[]>('/api/parts/catalog/modifications', { params });
    return data;
  }
};

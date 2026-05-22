import { http } from './http';
import {
  ServiceCatalogCategoryCreateDTO,
  ServiceCatalogCategoryDTO,
  ServiceCatalogItemCreateDTO,
  ServiceCatalogItemDTO,
  ServiceCatalogItemUpdateDTO
} from '../types/models';

export const serviceCatalogApi = {
  getCategories: async (params?: { activeOnly?: boolean }) => {
    const { data } = await http.get<ServiceCatalogCategoryDTO[]>('/api/service-catalog/categories', { params });
    return data;
  },
  createCategory: async (payload: ServiceCatalogCategoryCreateDTO) => {
    const { data } = await http.post<ServiceCatalogCategoryDTO>('/api/service-catalog/categories', payload);
    return data;
  },
  getServices: async (params?: { activeOnly?: boolean; categoryId?: number }) => {
    const { data } = await http.get<ServiceCatalogItemDTO[]>('/api/service-catalog/services', { params });
    return data;
  },
  createService: async (payload: ServiceCatalogItemCreateDTO) => {
    const { data } = await http.post<ServiceCatalogItemDTO>('/api/service-catalog/services', payload);
    return data;
  },
  updateService: async (id: number, payload: ServiceCatalogItemUpdateDTO) => {
    const { data } = await http.put<ServiceCatalogItemDTO>(`/api/service-catalog/services/${id}`, payload);
    return data;
  }
};

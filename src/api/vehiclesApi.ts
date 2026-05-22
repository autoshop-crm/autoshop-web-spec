import { http } from './http';
import { Vehicle } from '../types/models';

export interface VehicleCreatePayload {
  customerId: number;
  brand: string;
  model: string;
  vin: string;
  licensePlate: string;
}

export interface VehicleUpdatePayload {
  brand: string;
  model: string;
  vin: string;
  licensePlate: string;
}

export interface VehicleCatalogLinkPayload {
  type: string;
  manufacturerId: number;
  manufacturerName: string;
  modelSeriesId: number;
  modelSeriesName: string;
  modificationId: number;
  modificationName: string;
  engineDescription?: string;
}

export const vehiclesApi = {
  getById: async (id: string | number) => {
    const { data } = await http.get<Vehicle>(`/api/vehicles/${id}`);
    return data;
  },
  getByCustomerId: async (customerId: string | number) => {
    const { data } = await http.get<Vehicle[]>(`/api/vehicles/customer/${customerId}`);
    return data;
  },
  create: async (payload: VehicleCreatePayload) => {
    const { data } = await http.post<Vehicle>('/api/vehicles', payload);
    return data;
  },
  update: async (id: number, payload: VehicleUpdatePayload) => {
    const { data } = await http.put<Vehicle>(`/api/vehicles/${id}`, payload);
    return data;
  },
  linkCatalog: async (id: number, payload: VehicleCatalogLinkPayload) => {
    const { data } = await http.put<Vehicle>(`/api/vehicles/${id}/catalog-link`, payload);
    return data;
  },
  unlinkCatalog: async (id: number) => {
    await http.delete(`/api/vehicles/${id}/catalog-link`);
  }
};

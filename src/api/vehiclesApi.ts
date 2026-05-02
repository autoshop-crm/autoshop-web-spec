import { http } from './http';
import { Vehicle } from '../types/models';

export interface VehicleCreatePayload {
  customerId: number;
  brand: string;
  model: string;
  vin: string;
  licensePlate: string;
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
  }
};

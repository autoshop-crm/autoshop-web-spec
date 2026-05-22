import { http } from './http';
import { Customer } from '../types/models';

export interface CustomerCreatePayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export const customersApi = {
  search: async (params: {
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const { data } = await http.get<Customer[]>('/api/customers/search', { params });
    return data;
  },
  searchByQuery: async (query: string, signal?: AbortSignal) => {
    const { data } = await http.get<Customer[]>('/api/customers/search', {
      params: { query },
      signal
    });
    return data;
  },
  getById: async (id: string | number) => {
    const { data } = await http.get<Customer>(`/api/customers/${id}`);
    return data;
  },
  create: async (payload: CustomerCreatePayload) => {
    const { data } = await http.post<Customer>('/api/customers', payload);
    return data;
  }
};

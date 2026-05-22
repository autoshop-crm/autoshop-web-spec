import { http } from './http';
import { EmployeeAvailabilitySearchItem, EmployeeDirectoryItem, Role } from '../types/models';

export const employeesApi = {
  getAll: async () => {
    const { data } = await http.get<EmployeeDirectoryItem[]>('/api/employees');
    return data;
  },
  searchByQuery: async (query: string) => {
    const { data } = await http.get<EmployeeDirectoryItem[]>('/api/employees/search', {
      params: { query }
    });
    return data;
  },
  searchByAvailability: async (params: {
    plannedVisitAt: string;
    slotMinutes: number;
    roles?: Role[];
    query?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('plannedVisitAt', params.plannedVisitAt);
    searchParams.set('slotMinutes', String(params.slotMinutes));

    (params.roles ?? []).forEach((role) => {
      searchParams.append('roles', role);
    });

    if (params.query) {
      searchParams.set('query', params.query);
    }

    if (params.limit != null) {
      searchParams.set('limit', String(params.limit));
    }

    const { data } = await http.get<EmployeeAvailabilitySearchItem[]>(`/api/employees/availability-search?${searchParams.toString()}`);
    return data;
  }
};

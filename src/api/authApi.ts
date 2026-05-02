import axios from 'axios';
import { AuthUser, LoginPayload, LoginResponse, RefreshResponse, StaffUserCreatePayload, StaffUserResponse } from '../types/models';

const authHttp = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_BASE_URL ?? ''
});

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await authHttp.post<LoginResponse>('/api/auth/login', payload);
    return data;
  },
  refresh: async (refreshToken: string) => {
    const { data } = await authHttp.post<RefreshResponse>('/api/auth/refresh', { refreshToken });
    return data;
  },
  me: async (accessToken: string) => {
    const { data } = await authHttp.get<AuthUser>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return data;
  },
  logout: async (accessToken: string, refreshToken: string) => {
    await authHttp.post(
      '/api/auth/logout',
      { refreshToken },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
  },
  createStaffUser: async (accessToken: string, payload: StaffUserCreatePayload) => {
    const { data } = await authHttp.post<StaffUserResponse>('/api/admin/users', payload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return data;
  }
};

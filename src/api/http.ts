import axios from 'axios';
import { authStorage } from '../auth/storage';
import { authApi } from './authApi';

export const http = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_BASE_URL ?? ''
});

let refreshPromise: Promise<string | null> | null = null;

const redirectToLogin = () => {
  authStorage.clear();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

http.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = authStorage.getRefreshToken();
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      refreshPromise ??= authApi
        .refresh(refreshToken)
        .then((response) => {
          authStorage.setToken(response.accessToken);
          authStorage.setRefreshToken(response.refreshToken);
          return response.accessToken;
        })
        .catch((refreshError) => {
          redirectToLogin();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

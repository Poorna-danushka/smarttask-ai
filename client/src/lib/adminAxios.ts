import axios from 'axios';
import { store } from '../store';
import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveAuthTokens,
  clearAuthTokens,
  isAdminSession,
} from './tokenStorage';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const adminApi = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

adminApi.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.adminAuth?.accessToken
    || state.auth?.accessToken
    || getAccessToken(true)
    || getAccessToken(false);

  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const adminSession = isAdminSession();
        const refreshToken = getRefreshToken(adminSession) || getRefreshToken(false);

        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        const user = getStoredUser(adminSession);

        saveAuthTokens(accessToken, newRefreshToken, user, adminSession);

        if (adminSession) {
          const admin = store.getState().adminAuth?.admin;
          if (admin) {
            store.dispatch({ type: 'adminAuth/setAdminCredentials', payload: { admin, accessToken } });
          }
        } else {
          const userState = store.getState().auth?.user;
          if (userState) {
            store.dispatch({ type: 'auth/setCredentials', payload: { user: userState, accessToken } });
          }
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return adminApi(originalRequest);
      } catch (refreshError) {
        store.dispatch({ type: 'adminAuth/adminLogout' });
        store.dispatch({ type: 'auth/logout' });
        clearAuthTokens(true);
        clearAuthTokens(false);
        if (typeof window !== 'undefined') {
          window.location.href = '/admin-login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;

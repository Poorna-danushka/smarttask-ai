/**
 * Axios Configuration Module
 * 
 * Configures axios instance for user API requests with:
 * - Automatic access token injection
 * - Automatic token refresh on 401 errors
 * - Session persistence via cookies
 * - Redux state synchronization
 * 
 * @module axios
 * @see {@link http://localhost:5000/api} Backend API endpoint
 */

import axios from 'axios';
import { store } from '../store';
import { logout, setCredentials } from '../store/slices/authSlice';
import { getAccessToken, getRefreshToken, getStoredUser, saveAuthTokens, clearAuthTokens } from './tokenStorage';

/**
 * API base URL
 * Uses environment variable or defaults to local development server
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Axios instance for user API requests
 * 
 * Features:
 * - Automatic token injection via request interceptor
 * - Automatic token refresh via response interceptor
 * - JSON content type by default
 * - Error handling with token refresh fallback
 * 
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * Automatically adds JWT access token to all requests.
 * Checks both Redux state and cookies for the token to ensure
 * availability across different states.
 * 
 * Flow:
 * 1. Get current Redux auth state
 * 2. Fall back to cookie storage if not in Redux
 * 3. Add "Bearer <token>" to Authorization header
 * 4. Continue with request
 * 
 * @param {import('axios').InternalAxiosRequestConfig} config - Request configuration
 * @returns {import('axios').InternalAxiosRequestConfig} Modified config with auth header
 */
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken || getAccessToken(false);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 * 
 * Handles authentication errors and automatic token refresh.
 * 
 * Process on 401 (Unauthorized) error:
 * 1. Check if request already attempted refresh (prevent infinite loops)
 * 2. Get refresh token from cookies
 * 3. Call /auth/refresh endpoint with refresh token
 * 4. Get new access token and refresh token from response
 * 5. Save new tokens to cookies
 * 6. Update Redux auth state
 * 7. Retry original request with new access token
 * 
 * On refresh failure:
 * 1. Clear all auth tokens from cookies
 * 2. Dispatch logout action (clear Redux state)
 * 3. User will be redirected to login on next page access
 * 
 * @param {import('axios').AxiosResponse} response - Successful response
 * @returns {import('axios').AxiosResponse} Response data
 * 
 * @throws {Error} Propagates original error if not 401 or refresh fails
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401 errors and if not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Get refresh token from secure cookies
        const refreshToken = getRefreshToken(false);
        if (!refreshToken) throw new Error('No refresh token');

        // Request new tokens
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        const user = getStoredUser(false);

        // Save new tokens to cookies
        saveAuthTokens(accessToken, newRefreshToken, user, false);

        // Update Redux state with new token
        if (user) {
          store.dispatch(setCredentials({ user, accessToken }));
        }

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed - logout user
        clearAuthTokens(false);
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Export configured axios instance
 * Use this for all user API requests
 * 
 * @example
 * import api from '@/lib/axios'
 * const response = await api.get('/projects')
 * const data = await api.post('/tasks', { title: 'New Task' })
 */
export default api;


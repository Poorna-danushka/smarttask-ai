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
import { saveAuthTokens, clearAuthTokens, getCookie } from './tokenStorage';

/**
 * API base URL
 * Uses environment variable or defaults to local development server
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Axios instance for user API requests
 * 
 * Features:
 * - Automatic CSRF token injection
 * - Automatic token refresh via response interceptor
 * - JSON content type by default
 * - Error handling with token refresh fallback
 * 
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
  baseURL,
});

api.defaults.withCredentials = true;

// Set JSON content-type for every non-FormData request
api.interceptors.request.use(
  (config) => {
    // If sending FormData, remove any preset Content-Type so
    // the browser / axios can set it with the correct boundary.
    if (config.data instanceof FormData) {
      if (config.headers) delete config.headers['Content-Type'];
    } else if (config.headers && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Attach CSRF Token from cookie
    const csrfToken = getCookie('csrfToken');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
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
 * 2. Call /auth/refresh endpoint (HttpOnly cookies sent automatically)
 * 3. Get new user info from response
 * 4. Save new metadata to cookies
 * 5. Update Redux auth state
 * 6. Retry original request
 * 
 * On refresh failure:
 * 1. Clear all auth metadata from cookies
 * 2. Dispatch logout action (clear Redux state)
 * 3. User will be redirected to login on next page access
 * 
 * @param {import('axios').AxiosResponse} response - Successful response
 * @returns {import('axios').AxiosResponse} Response data
 * 
 * @throws {Error} Propagates original error if not 401 or refresh fails
 */
let refreshPromise: Promise<any> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401 errors and if not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          const csrfToken = getCookie('csrfToken');
          const headers: Record<string, string> = {};
          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
          }
          refreshPromise = axios.post(`${baseURL}/auth/refresh`, {}, { headers, withCredentials: true })
            .then((res) => {
              const { user } = res.data;
              // Save new user metadata to cookies
              saveAuthTokens(user);
              // Update Redux state with new user metadata
              if (user) {
                store.dispatch(setCredentials({ user }));
              }
              refreshPromise = null;
              return res;
            })
            .catch((err) => {
              refreshPromise = null;
              // Token refresh failed - logout user
              clearAuthTokens();
              store.dispatch(logout());
              throw err;
            });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Export configured axios instance
 * Use this for all user API requests
 */
export default api;


/**
 * Token Storage Module
 *
 * Manages non-sensitive user metadata in cookies.
 * JWT access/refresh tokens are stored exclusively in HttpOnly cookies
 * set by the server and are never accessible from JavaScript.
 *
 * @module tokenStorage
 */

/** Check if code is running in a browser environment */
const isBrowser = typeof window !== 'undefined';

/**
 * Get cookie value by name
 */
export const getCookie = (name: string): string | null => {
  if (!isBrowser) return null;
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
};

/**
 * Set a cookie
 */
export const setCookie = (name: string, value: string, days = 7) => {
  if (!isBrowser) return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict${secure}`;
};

/**
 * Remove a cookie
 */
export const removeCookie = (name: string) => {
  if (!isBrowser) return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
};

/** Safely parse JSON */
const jsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string | null;
}

/**
 * Save user metadata to a cookie (not the JWT — that's HttpOnly server-side).
 * Uses a single unified cookie name `userInfo` regardless of role.
 */
export const saveAuthTokens = (user: StoredUser | null, _isAdmin = false) => {
  if (user) {
    // Remove any legacy role-specific cookies first
    removeCookie('adminInfo');
    removeCookie('userInfo');
    // Save under unified name
    setCookie('userInfo', JSON.stringify(user), 7);
  }
};

/**
 * Clear auth user metadata cookie.
 */
export const clearAuthTokens = (_isAdmin = false) => {
  removeCookie('userInfo');
  removeCookie('adminInfo'); // also clear legacy
};

/**
 * Get stored user info from cookies.
 * Reads from unified `userInfo` cookie; falls back to legacy `adminInfo`.
 */
export const getStoredUser = (_isAdmin = false): StoredUser | null => {
  return jsonParse<StoredUser>(getCookie('userInfo')) ||
         jsonParse<StoredUser>(getCookie('adminInfo'));
};

/**
 * Check if an active admin session exists
 */
export const isAdminSession = (): boolean => {
  const user = getStoredUser();
  return user?.role === 'admin';
};

/**
 * Stubs — JWTs live in HttpOnly cookies set by the server.
 */
export const getAccessToken = (_isAdmin = false) => null;
export const getRefreshToken = (_isAdmin = false) => null;

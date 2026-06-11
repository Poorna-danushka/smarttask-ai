/**
 * Token Storage Module
 * 
 * Manages secure HTTP-only cookie-based storage for authentication tokens.
 * This module provides centralized functions for managing user and admin auth tokens,
 * preventing XSS attacks by storing sensitive tokens in HTTP-only cookies.
 * 
 * @module tokenStorage
 * @see {@link saveAuthTokens} Save user/admin tokens to cookies
 * @see {@link getAccessToken} Retrieve access token for API requests
 */

/**
 * Check if code is running in browser environment
 * Prevents SSR errors when accessing window object
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Generate HTTP-only cookie options
 * 
 * Security features:
 * - SameSite=Strict: Prevents CSRF attacks
 * - Secure flag: Only sent over HTTPS in production
 * - Expires: Configurable expiration (default 7 days)
 * 
 * @param {number} days - Cookie expiration in days (default: 7)
 * @returns {string} Cookie options string
 * 
 * @example
 * cookieOptions(1) // For access token (1 day)
 * cookieOptions(7) // For refresh token (7 days)
 */
const cookieOptions = (days = 7) => {
  const secure = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  return `; expires=${expires}; path=/; SameSite=Strict${secure ? '; Secure' : ''}`;
};

/**
 * Set a cookie with secure options
 * 
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default: 7)
 * 
 * @example
 * setCookie('userAccessToken', 'token_value', 1)
 */
export const setCookie = (name: string, value: string, days = 7) => {
  if (!isBrowser) return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${cookieOptions(days)}`;
};

/**
 * Get cookie value by name
 * 
 * @param {string} name - Cookie name to retrieve
 * @returns {string|null} Cookie value or null if not found
 * 
 * @example
 * const token = getCookie('userAccessToken')
 */
export const getCookie = (name: string) => {
  if (!isBrowser) return null;
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i += 1) {
    let cookie = cookies[i].trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
};

/**
 * Remove a cookie by setting expiration to past date
 * 
 * @param {string} name - Cookie name to remove
 * 
 * @example
 * removeCookie('userAccessToken')
 */
export const removeCookie = (name: string) => {
  if (!isBrowser) return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
};

/**
 * Safely parse JSON stored in cookies
 * 
 * @template T - Type of parsed object
 * @param {string|null} value - JSON string to parse
 * @returns {T|null} Parsed object or null on error
 */
const jsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/**
 * User information stored in cookies after login
 * 
 * @interface StoredUser
 * @property {string} id - User ID
 * @property {string} username - User's display name
 * @property {string} email - User's email address
 * @property {string} role - User role (user | admin)
 */
export interface StoredUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Save authentication tokens to secure cookies
 * 
 * Stores both access and refresh tokens with different expiration times:
 * - Access token: 1 day (short-lived for security)
 * - Refresh token: 7 days (used to get new access tokens)
 * - User info: 7 days (for quick rehydration)
 * 
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @param {StoredUser|null} user - User information
 * @param {boolean} isAdmin - Whether tokens are for admin session
 * 
 * @example
 * saveAuthTokens(accessToken, refreshToken, user, false)
 * // Stores: userAccessToken, userRefreshToken, userInfo
 */
export const saveAuthTokens = (
  accessToken: string,
  refreshToken: string,
  user: StoredUser | null,
  isAdmin = false
) => {
  const prefix = isAdmin ? 'admin' : 'user';
  setCookie(`${prefix}AccessToken`, accessToken, 1);
  setCookie(`${prefix}RefreshToken`, refreshToken, 7);
  if (user) {
    setCookie(`${prefix}Info`, JSON.stringify(user), 7);
  }
};

/**
 * Clear all authentication tokens and user info
 * Called on logout to remove all auth data
 * 
 * @param {boolean} isAdmin - Whether to clear admin or user tokens
 * 
 * @example
 * clearAuthTokens(false) // Clear user tokens
 * clearAuthTokens(true)  // Clear admin tokens
 */
export const clearAuthTokens = (isAdmin = false) => {
  const prefix = isAdmin ? 'admin' : 'user';
  removeCookie(`${prefix}AccessToken`);
  removeCookie(`${prefix}RefreshToken`);
  removeCookie(`${prefix}Info`);
};

/**
 * Get current access token from cookies
 * Used by axios interceptor to add token to API requests
 * 
 * @param {boolean} isAdmin - Get admin or user access token
 * @returns {string|null} Access token or null if not found
 * 
 * @example
 * const token = getAccessToken(false) // Get user token
 */
export const getAccessToken = (isAdmin = false) => {
  const prefix = isAdmin ? 'admin' : 'user';
  return getCookie(`${prefix}AccessToken`);
};

/**
 * Get current refresh token from cookies
 * Used to obtain new access tokens when expired
 * 
 * @param {boolean} isAdmin - Get admin or user refresh token
 * @returns {string|null} Refresh token or null if not found
 */
export const getRefreshToken = (isAdmin = false) => {
  const prefix = isAdmin ? 'admin' : 'user';
  return getCookie(`${prefix}RefreshToken`);
};

/**
 * Get stored user information from cookies
 * Used for session rehydration on page refresh
 * 
 * @param {boolean} isAdmin - Get admin or user info
 * @returns {StoredUser|null} User information or null if not found
 * 
 * @example
 * const user = getStoredUser(false)
 * if (user) {
 *   dispatch(setCredentials({ user, accessToken }))
 * }
 */
export const getStoredUser = (isAdmin = false): StoredUser | null => {
  const prefix = isAdmin ? 'admin' : 'user';
  return jsonParse<StoredUser>(getCookie(`${prefix}Info`));
};

/**
 * Check if an active admin session exists
 * 
 * @returns {boolean} True if admin refresh token exists
 */
export const isAdminSession = () => Boolean(getRefreshToken(true));


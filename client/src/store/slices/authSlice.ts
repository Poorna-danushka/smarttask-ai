/**
 * User Authentication Redux Slice
 * 
 * Manages user authentication state including:
 * - Current user information
 * - Access token for API requests
 * - Authentication status
 * - Session rehydration from cookies
 * 
 * @module authSlice
 * @see {@link setCredentials} Update user and token
 * @see {@link logout} Clear user session
 * @see {@link rehydrateAuth} Restore session from cookies
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthTokens, getStoredUser } from '@/lib/tokenStorage';

/**
 * User information stored in Redux and cookies
 * 
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} username - Display name
 * @property {string} email - User email address
 * @property {string} role - User role (user | admin)
 */
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  /** Optional profile picture URL (relative path stored in DB, e.g. /uploads/avatar-xxx.jpg) */
  avatar?: string | null;
}

/**
 * Authentication Redux state
 * 
 * @interface AuthState
 * @property {User|null} user - Current logged-in user or null
 * @property {boolean} isAuthenticated - Whether user is currently authenticated
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

/**
 * Initial auth state
 * All values are null/false until user logs in
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

/**
 * User Auth Redux Slice
 * 
 * Creates reducers and actions for managing user authentication state.
 * Works in conjunction with tokenStorage (cookies) and axios interceptors.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set user credentials after successful login
     * 
     * Called by login and register pages.
     * Updates both Redux state and cookies for persistence.
     * 
     * @param {AuthState} state - Current Redux state
     * @param {PayloadAction<{user: User}>} action - Login response
     * 
     * @example
     * dispatch(setCredentials({ user }))
     */
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },

    /**
     * Clear user session on logout
     * 
     * Clears Redux state and removes all auth cookies.
     * Called after user clicks logout or on token refresh failure.
     * Browser will redirect to login after this action.
     * 
     * @param {AuthState} state - Current Redux state
     * 
     * @example
     * dispatch(logout())
     */
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        clearAuthTokens();
      }
    },

    /**
     * Rehydrate auth state from secure cookies
     * 
     * Called on page load/refresh to restore user session from cookies.
     * 
     * Flow:
     * 1. Get user info from cookie
     * 2. If it exists, restore to Redux state
     * 
     * @param {AuthState} state - Current Redux state
     * 
     * @example
     * // Called in useEffect on app initialization
     * dispatch(rehydrateAuth())
     */
    rehydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        const user = getStoredUser();
        // Only hydrate if stored user is a regular user (not admin)
        if (user && user.role !== 'admin') {
          state.user = user;
          state.isAuthenticated = true;
        }
      }
    },
  },
});

/**
 * Export auth actions for use in components
 * 
 * @example
 * import { setCredentials, logout, rehydrateAuth } from '@/store/slices/authSlice'
 */
export const { setCredentials, logout, rehydrateAuth } = authSlice.actions;

/**
 * Export auth reducer for store configuration
 */
export default authSlice.reducer;


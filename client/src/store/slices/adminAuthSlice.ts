import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthTokens, getStoredUser } from '@/lib/tokenStorage';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface AdminAuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
}

const initialState: AdminAuthState = {
  admin: null,
  isAuthenticated: false,
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdminCredentials: (state, action: PayloadAction<{ admin: Admin }>) => {
      state.admin = action.payload.admin;
      state.isAuthenticated = true;
    },
    adminLogout: (state) => {
      state.admin = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        clearAuthTokens();
      }
    },
    rehydrateAdmin: (state) => {
      if (typeof window !== 'undefined') {
        const stored = getStoredUser();
        if (stored && stored.role === 'admin') {
          state.admin = stored;
          state.isAuthenticated = true;
        }
      }
    },
  },
});

export const { setAdminCredentials, adminLogout, rehydrateAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthTokens, getAccessToken, getStoredUser } from '@/lib/tokenStorage';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AdminAuthState {
  admin: Admin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AdminAuthState = {
  admin: null,
  accessToken: null,
  isAuthenticated: false,
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdminCredentials: (state, action: PayloadAction<{ admin: Admin; accessToken: string }>) => {
      state.admin = action.payload.admin;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    adminLogout: (state) => {
      state.admin = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        clearAuthTokens(true);
      }
    },
    rehydrateAdmin: (state) => {
      if (typeof window !== 'undefined') {
        const token = getAccessToken(true);
        const admin = getStoredUser(true);
        if (token && admin) {
          state.accessToken = token;
          state.admin = admin;
          state.isAuthenticated = true;
        }
      }
    },
  },
});

export const { setAdminCredentials, adminLogout, rehydrateAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;

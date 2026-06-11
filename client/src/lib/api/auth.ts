import api from '../axios';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export const login = (payload: LoginPayload) => api.post('/auth/login', payload);
export const register = (payload: RegisterPayload) => api.post('/auth/register', payload);
export const refresh = (refreshToken: string) => api.post('/auth/refresh', { refreshToken });

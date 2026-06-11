import api from '../axios';

export const getDashboardStats = () => api.get('/dashboard/stats');
export const getNotifications = () => api.get('/notifications');
export const updateProfile = (payload: { username: string }) => api.patch('/user/profile', payload);
export const changePassword = (payload: { currentPassword: string; newPassword: string }) => api.patch('/user/change-password', payload);
export const searchGlobal = (query: string) => api.get(`/search?q=${encodeURIComponent(query)}`);

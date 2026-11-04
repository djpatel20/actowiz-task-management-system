import { apiClient } from '../../lib/axios.js';
import { ApiResponse, User } from '../../types/index.js';

export const authApi = {
  login: async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post<ApiResponse<{ user: User }>>('/auth/login', {
      email,
      password,
    });
    return res.data.data.user;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data.user;
  },
};

import { apiClient } from '../../lib/axios.js';
import { ApiResponse, User, UserRole } from '../../types/index.js';

export const usersApi = {
  listUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    teamId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{ users: User[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return {
      users: res.data.data,
      total: res.data.meta?.total || res.data.data.length,
    };
  },

  createUser: async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    teamId?: string;
  }): Promise<User> => {
    const res = await apiClient.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },

  updateUser: async (
    userId: string,
    data: {
      name?: string;
      email?: string;
      role?: UserRole;
      teamId?: string | null;
    }
  ): Promise<User> => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${userId}`, data);
    return res.data.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${userId}/status`, { isActive });
    return res.data.data;
  },
};

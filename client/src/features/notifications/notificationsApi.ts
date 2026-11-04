import { apiClient } from '../../lib/axios.js';
import { ApiResponse, Notification } from '../../types/index.js';

export const notificationsApi = {
  listNotifications: async (params?: {
    isRead?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const res = await apiClient.get<ApiResponse<Notification[]>>('/notifications', { params });
    return {
      notifications: res.data.data,
      unreadCount: res.data.meta?.unreadCount || 0,
    };
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const res = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${notificationId}/read`);
    return res.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};

import { apiClient } from '../../lib/axios.js';
import { ApiResponse, Task } from '../../types/index.js';

export interface DashboardStats {
  openTasks: number;
  inReviewTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalProjects: number;
  recentTasks: Task[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return res.data.data;
  },
};

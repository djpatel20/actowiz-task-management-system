import { apiClient } from '../../lib/axios.js';
import { ApiResponse, Project, ProjectStatus } from '../../types/index.js';

export const projectsApi = {
  listProjects: async (params?: {
    page?: number;
    limit?: number;
    teamId?: string;
    status?: ProjectStatus;
    search?: string;
  }): Promise<{ projects: Project[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<Project[]>>('/projects', { params });
    return {
      projects: res.data.data,
      total: res.data.meta?.total || res.data.data.length,
    };
  },

  getProjectById: async (projectId: string): Promise<Project> => {
    const res = await apiClient.get<ApiResponse<Project>>(`/projects/${projectId}`);
    return res.data.data;
  },

  createProject: async (data: {
    name: string;
    description?: string;
    client: string;
    startDate: string;
    endDate: string;
    teamId: string;
  }): Promise<Project> => {
    const res = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return res.data.data;
  },

  updateProject: async (
    projectId: string,
    data: {
      name?: string;
      description?: string;
      client?: string;
      startDate?: string;
      endDate?: string;
      status?: ProjectStatus;
    }
  ): Promise<Project> => {
    const res = await apiClient.patch<ApiResponse<Project>>(`/projects/${projectId}`, data);
    return res.data.data;
  },
};

import { apiClient } from '../../lib/axios.js';
import { ApiResponse, Team, User } from '../../types/index.js';

export const teamsApi = {
  listTeams: async (params?: { page?: number; limit?: number; search?: string }): Promise<Team[]> => {
    const res = await apiClient.get<ApiResponse<Team[]>>('/teams', { params });
    return res.data.data;
  },

  getTeamById: async (teamId: string): Promise<Team> => {
    const res = await apiClient.get<ApiResponse<Team>>(`/teams/${teamId}`);
    return res.data.data;
  },

  createTeam: async (data: { name: string; description?: string; managerId?: string }): Promise<Team> => {
    const res = await apiClient.post<ApiResponse<Team>>('/teams', data);
    return res.data.data;
  },

  updateTeam: async (
    teamId: string,
    data: { name?: string; description?: string; managerId?: string | null }
  ): Promise<Team> => {
    const res = await apiClient.patch<ApiResponse<Team>>(`/teams/${teamId}`, data);
    return res.data.data;
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    await apiClient.delete(`/teams/${teamId}`);
  },

  getTeamMembers: async (teamId: string): Promise<User[]> => {
    const res = await apiClient.get<ApiResponse<User[]>>(`/teams/${teamId}/members`);
    return res.data.data;
  },

  addTeamMember: async (teamId: string, userId: string): Promise<void> => {
    await apiClient.post(`/teams/${teamId}/members`, { userId });
  },

  removeTeamMember: async (teamId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/teams/${teamId}/members/${userId}`);
  },
};

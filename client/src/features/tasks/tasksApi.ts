import { apiClient } from '../../lib/axios.js';
import { ApiResponse, Task, Comment, Activity, Attachment, TaskStatus, TaskPriority } from '../../types/index.js';

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  overdue?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const tasksApi = {
  listTasks: async (params?: TaskQueryParams): Promise<{ tasks: Task[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<Task[]>>('/tasks', { params });
    return {
      tasks: res.data.data,
      total: res.data.meta?.total || res.data.data.length,
    };
  },

  getTaskById: async (taskId: string): Promise<Task> => {
    const res = await apiClient.get<ApiResponse<Task>>(`/tasks/${taskId}`);
    return res.data.data;
  },

  createTask: async (data: {
    title: string;
    description?: string;
    projectId: string;
    teamId: string;
    assigneeId: string;
    priority?: TaskPriority;
    dueDate: string;
  }): Promise<Task> => {
    const res = await apiClient.post<ApiResponse<Task>>('/tasks', data);
    return res.data.data;
  },

  updateTask: async (
    taskId: string,
    data: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
    }
  ): Promise<Task> => {
    const res = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}`, data);
    return res.data.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  transitionStatus: async (
    taskId: string,
    data: {
      status: TaskStatus;
      version: number;
      rejectionReason?: string;
    }
  ): Promise<Task> => {
    const res = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/status`, data);
    return res.data.data;
  },

  exportCsv: async (params?: TaskQueryParams): Promise<void> => {
    const res = await apiClient.get('/tasks/export/csv', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Comments
  listComments: async (taskId: string): Promise<Comment[]> => {
    const res = await apiClient.get<ApiResponse<Comment[]>>(`/tasks/${taskId}/comments`);
    return res.data.data;
  },

  addComment: async (taskId: string, content: string): Promise<Comment> => {
    const res = await apiClient.post<ApiResponse<Comment>>(`/tasks/${taskId}/comments`, { content });
    return res.data.data;
  },

  // Activities
  listActivities: async (taskId: string): Promise<Activity[]> => {
    const res = await apiClient.get<ApiResponse<Activity[]>>(`/tasks/${taskId}/activity`);
    return res.data.data;
  },

  // Attachments
  uploadAttachment: async (taskId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<Attachment>>(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  deleteAttachment: async (taskId: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },
};

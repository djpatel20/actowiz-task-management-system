export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_REASSIGNED'
  | 'STATUS_CHANGED'
  | 'REVIEW_REJECTED'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_DELETED';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_SUBMITTED_FOR_REVIEW'
  | 'TASK_REVIEW_APPROVED'
  | 'TASK_REVIEW_REJECTED'
  | 'TASK_DUE_SOON'
  | 'COMMENT_ADDED';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string | null;
  teamIds?: string[];
  team?: {
    id: string;
    _id?: string;
    name: string;
    description?: string;
  } | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Team {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  managerId?: User | { _id: string; name: string; email: string; role?: UserRole } | null;
  managerIds?: string[];
  memberIds?: string[];
  managers?: (User | { _id: string; name: string; email: string; role?: UserRole })[];
  projectCount?: number;
  managerCount?: number;
  employeeCount?: number;
  memberCount?: number;
  createdAt?: string;
}

export interface Project {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  client: string;
  startDate: string;
  endDate: string;
  teamId: Team | { _id: string; name: string; description?: string } | string;
  managerId?: User | { _id: string; name: string; email: string; role?: UserRole } | null;
  status: ProjectStatus;
  progressPercentage?: number;
  totalTasks?: number;
  completedTasks?: number;
  createdBy?: User | string;
  createdAt?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: User | string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  projectId: Project | { _id: string; name: string; client?: string; status?: ProjectStatus };
  teamId: Team | { _id: string; name: string };
  assigneeId: User | { _id: string; name: string; email: string; role: UserRole };
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  completedAt?: string;
  attachments?: Attachment[];
  createdBy?: User | { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Comment {
  _id: string;
  taskId: string;
  authorId: User | { _id: string; name: string; email: string; role: UserRole };
  content: string;
  createdAt: string;
}

export interface Activity {
  _id: string;
  taskId: string;
  actorId: User | { _id: string; name: string; email: string; role: UserRole };
  action: ActivityAction;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  details?: {
    isOverride?: boolean;
    filename?: string;
    size?: number;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount?: number;
  };
}

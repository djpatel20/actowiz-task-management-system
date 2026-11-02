import { Request } from 'express';
import { Types } from 'mongoose';
import { UserRole } from '../../config/constants.js';

export interface AuthUserPayload {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  teamId?: Types.ObjectId;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  sessionId?: Types.ObjectId;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
  };
}

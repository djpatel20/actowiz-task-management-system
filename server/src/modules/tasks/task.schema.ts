import { z } from 'zod';
import { TASK_PRIORITY, TASK_STATUS } from '../../config/constants.js';
import { isPastDate } from '../../utils/dateValidator.js';

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional(),
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project ID'),
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID'),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Assignee ID'),
  priority: z.nativeEnum(TASK_PRIORITY).default(TASK_PRIORITY.MEDIUM),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 datetime' })
    .refine((val) => !isPastDate(val), {
      message: 'Due date cannot be in the past',
    }),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO 8601 datetime' })
    .optional()
    .refine((val) => !val || !isPastDate(val), {
      message: 'Due date cannot be in the past',
    }),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Assignee ID').optional(),
});

export const transitionStatusSchema = z
  .object({
    status: z.nativeEnum(TASK_STATUS),
    version: z.number().int().min(0, 'Version key (__v) is required for OCC'),
    rejectionReason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      // Rejection check will be rigorously evaluated against previous status in service,
      // but if status is IN_PROGRESS and reason is supplied, it must be min 5 characters
      if (data.rejectionReason !== undefined && data.rejectionReason.length > 0) {
        return data.rejectionReason.length >= 5;
      }
      return true;
    },
    {
      message: 'Rejection reason must be at least 5 characters',
      path: ['rejectionReason'],
    }
  );

export const taskQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project ID').optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Assignee ID').optional(),
  dueDate: z.string().optional(),
  overdue: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  search: z.string().trim().optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

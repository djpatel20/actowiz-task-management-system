import { z } from 'zod';
import { USER_ROLES } from '../../config/constants.js';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.nativeEnum(USER_ROLES),
    teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').optional(),
  })
  .refine(
    (data) => {
      if ((data.role === USER_ROLES.MANAGER || data.role === USER_ROLES.EMPLOYEE) && !data.teamId) {
        return false;
      }
      return true;
    },
    {
      message: 'Team assignment is required for Managers and Employees',
      path: ['teamId'],
    }
  );

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  role: z.nativeEnum(USER_ROLES).optional(),
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const userQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  role: z.nativeEnum(USER_ROLES).optional(),
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().trim().optional(),
});

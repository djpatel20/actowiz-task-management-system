import { z } from 'zod';
import { USER_ROLES } from '../../config/constants.js';

export const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email address is required' })
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    role: z.nativeEnum(USER_ROLES, {
      errorMap: () => ({ message: 'Please select a valid role (ADMIN, MANAGER, or EMPLOYEE)' }),
    }),
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
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .optional(),
  role: z
    .nativeEnum(USER_ROLES, {
      errorMap: () => ({ message: 'Please select a valid role' }),
    })
    .optional(),
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'Account status (isActive) is required' }),
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

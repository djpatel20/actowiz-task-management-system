import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .trim()
    .min(2, 'Team name must be at least 2 characters long')
    .max(100, 'Team name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Manager ID').optional(),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Team name must be at least 2 characters long')
    .max(100, 'Team name cannot exceed 100 characters')
    .optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Manager ID').nullable().optional(),
});

export const teamQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().trim().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string({ required_error: 'User ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
});

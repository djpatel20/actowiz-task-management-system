import { z } from 'zod';
import { PROJECT_STATUS } from '../../config/constants.js';
import { isPastDate } from '../../utils/dateValidator.js';

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(2000).optional(),
    client: z.string().trim().min(2).max(150),
    startDate: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO 8601 datetime' })
      .refine((val) => !isPastDate(val), {
        message: 'Start date cannot be in the past',
      }),
    endDate: z
      .string()
      .datetime({ message: 'End date must be a valid ISO 8601 datetime' })
      .refine((val) => !isPastDate(val), {
        message: 'End date cannot be in the past',
      }),
    teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID'),
    managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Manager ID').optional(),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    client: z.string().trim().min(2).max(150).optional(),
    startDate: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO 8601 datetime' })
      .optional()
      .refine((val) => !val || !isPastDate(val), {
        message: 'Start date cannot be in the past',
      }),
    endDate: z
      .string()
      .datetime({ message: 'End date must be a valid ISO 8601 datetime' })
      .optional()
      .refine((val) => !val || !isPastDate(val), {
        message: 'End date cannot be in the past',
      }),
    teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').optional(),
    status: z.nativeEnum(PROJECT_STATUS).optional(),
    managerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Manager ID').nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const projectQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Team ID').optional(),
  status: z.nativeEnum(PROJECT_STATUS).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['startDate', 'endDate', 'createdAt', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

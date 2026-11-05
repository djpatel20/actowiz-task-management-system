import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string({ required_error: 'Comment cannot be empty' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

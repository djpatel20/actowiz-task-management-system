import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max attempts per window per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Max requests per minute per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please slow down your requests.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

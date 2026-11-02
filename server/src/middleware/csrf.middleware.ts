import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';

export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  // Safe HTTP methods do not require CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt public auth login/refresh from requiring XMLHttpRequest if necessary, but according to API spec:
  // Mutating requests validate X-Requested-With or valid Origin/Referer
  const customHeader = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // In test environment, skip if not provided
  if (env.NODE_ENV === 'test') {
    return next();
  }

  if (customHeader === 'XMLHttpRequest') {
    return next();
  }

  const allowedOrigins = env.CLIENT_URL.split(',').map((u) => u.trim());

  if (origin && allowedOrigins.includes(origin)) {
    return next();
  }

  if (referer && allowedOrigins.some((allowed) => referer.startsWith(allowed))) {
    return next();
  }

  return next(
    new ForbiddenError('CSRF protection: missing or invalid custom header/origin')
  );
};

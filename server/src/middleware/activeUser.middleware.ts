import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/index.js';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';

export const requireActiveUser = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (!req.user.isActive) {
    return next(new ForbiddenError('User account has been deactivated'));
  }
  next();
};

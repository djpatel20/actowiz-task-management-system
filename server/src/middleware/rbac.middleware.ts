import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/index.js';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';
import { UserRole } from '../config/constants.js';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};

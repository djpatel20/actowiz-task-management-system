import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/index.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';
import { COOKIE_NAMES } from '../config/constants.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../modules/users/user.model.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or not found');
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication session'));
  }
};

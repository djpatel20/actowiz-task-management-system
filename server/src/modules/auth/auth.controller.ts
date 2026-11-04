import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { clearAuthCookies, setAuthCookies } from '../../utils/cookies.js';
import { COOKIE_NAMES } from '../../config/constants.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { User } from '../users/user.model.js';
import { Team } from '../teams/team.model.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, accessToken, refreshToken } = await AuthService.login(
        email,
        password,
        userAgent,
        ipAddress
      );

      setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamId: user.teamId,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token required');
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, accessToken, refreshToken } = await AuthService.refresh(
        rawRefreshToken,
        userAgent,
        ipAddress
      );

      setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamId: user.teamId,
          },
        },
      });
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      await AuthService.logout(rawRefreshToken);
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await User.findById(req.user._id).lean();
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      let team = null;
      if (user.teamId) {
        team = await Team.findById(user.teamId).lean();
      } else if (user.role === 'MANAGER') {
        team = await Team.findOne({ managerId: user._id }).lean();
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamId: user.teamId || (team ? team._id : undefined),
            team: team
              ? {
                  id: team._id,
                  _id: team._id,
                  name: team.name,
                  description: team.description,
                }
              : null,
            isActive: user.isActive,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

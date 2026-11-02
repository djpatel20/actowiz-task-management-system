import bcrypt from 'bcrypt';
import { User, IUserDocument } from '../users/user.model.js';
import { RefreshToken } from './session.model.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashToken,
} from '../../utils/tokens.js';

export interface AuthResult {
  user: IUserDocument;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      // Mitigate timing attacks with dummy hash check
      await bcrypt.compare(password, '$2b$12$e8Z401Z1qJ2xO/5uOQzVre73fEa.m.gH1vN8RkJmP3L0E9xXw8vS6');
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      teamId: user.teamId ? user.teamId.toString() : null,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      isRevoked: false,
      userAgent,
      ipAddress,
    });

    return {
      user,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  static async refresh(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await RefreshToken.findOne({ tokenHash });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      // If session exists but was already revoked, possible token theft attempt -> revoke all user sessions
      if (session && session.isRevoked) {
        await RefreshToken.updateMany({ userId: session.userId }, { $set: { isRevoked: true } });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      session.isRevoked = true;
      await session.save();
      throw new UnauthorizedError('User account inactive or not found');
    }

    // Invalidate old session (token rotation)
    session.isRevoked = true;
    await session.save();

    // Issue new token pair
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      teamId: user.teamId ? user.teamId.toString() : null,
    });

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt,
      isRevoked: false,
      userAgent,
      ipAddress,
    });

    return {
      user,
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.updateOne({ tokenHash }, { $set: { isRevoked: true } });
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId }, { $set: { isRevoked: true } });
  }
}

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { UserRole } from '../config/constants.js';

export interface TokenUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  teamId?: string | null;
}

export const generateAccessToken = (payload: TokenUserPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): TokenUserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenUserPayload;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const getRefreshTokenExpiryDate = (): Date => {
  // Parses "7d", "15m", etc. Default is 7 days
  const msInDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + 7 * msInDay);
};

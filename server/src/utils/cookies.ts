import { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { COOKIE_NAMES } from '../config/constants.js';

export const getAccessTokenCookieOptions = (): CookieOptions => {
  const isHttps = env.CLIENT_URL.startsWith('https://');
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  };
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isHttps = env.CLIENT_URL.startsWith('https://');
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions());
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, getRefreshTokenCookieOptions());
};

export const clearAuthCookies = (res: Response) => {
  const isHttps = env.CLIENT_URL.startsWith('https://');
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
};

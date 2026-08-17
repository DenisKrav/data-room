import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function refreshCookieOptions(
  config: ConfigService,
  expiresAt?: Date,
): CookieOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    expires: expiresAt,
  };
}

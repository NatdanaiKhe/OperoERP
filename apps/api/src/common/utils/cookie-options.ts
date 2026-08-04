import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';

export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: config.getOrThrow<string>('NODE_ENV') === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}

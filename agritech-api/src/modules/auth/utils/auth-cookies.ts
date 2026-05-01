import type { Response } from 'express';
import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'agg_access';
export const REFRESH_TOKEN_COOKIE = 'agg_refresh';

/**
 * Build cookie options based on environment.
 * In production, uses Secure + SameSite=Lax. In dev, omits Secure so cookies
 * work over plain HTTP on localhost.
 */
function baseCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

/**
 * Set access + refresh tokens as httpOnly cookies on the response.
 * - access cookie: short TTL aligned with `expiresIn` seconds (default 1h)
 * - refresh cookie: 30 days
 */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; expiresIn?: number },
): void {
  const opts = baseCookieOptions();
  const accessMaxAge = (tokens.expiresIn || 3600) * 1000;
  const refreshMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...opts,
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...opts,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
}

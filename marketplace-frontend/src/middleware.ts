import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First handle i18n
  const intlResponse = intlMiddleware(request);

  // Then handle Supabase session
  const sessionResponse = await updateSession(request);

  // Merge headers from both responses
  if (intlResponse && sessionResponse) {
    intlResponse.headers.forEach((value, key) => {
      sessionResponse.headers.set(key, value);
    });
    return sessionResponse;
  }

  return intlResponse || sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

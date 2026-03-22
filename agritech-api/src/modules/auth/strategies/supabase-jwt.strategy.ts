import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

/**
 * Custom Supabase JWT Guard
 *
 * Bypasses passport-jwt's local verification since Supabase uses RS256.
 * Validates tokens directly with Supabase for security.
 */
@Injectable()
export class SupabaseJwtGuard extends AuthGuard('jwt') {
  constructor(private authService: AuthService) {
    super();
  }

  canActivate(context: ExecutionContext): Observable<boolean> | Promise<boolean> | boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    // Decode JWT without verification to extract payload
    // We'll validate with Supabase below
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Decode payload (base64url)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );

      // Attach payload to request for use in controllers
      request.userPayload = payload;

      // Validate with Supabase (real security check)
      return this.authService.validateToken(token)
        .then((user) => {
          // Attach full user to request
          request.user = {
            ...user,
            sub: user.id,
            userId: user.id,
          };
          return true;
        })
        .catch((error) => {
          console.error('[SupabaseJwtGuard] Token validation failed:', error.message);
          throw new UnauthorizedException('Invalid or expired token');
        });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[SupabaseJwtGuard] Token processing failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

/**
 * Public decorator that can be used to bypass auth
 */
export const Public = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('isPublic', true, descriptor.value);
    return descriptor;
  };
};

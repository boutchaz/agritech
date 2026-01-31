import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Supabase JWT Guard
 *
 * Bypasses passport-jwt which cannot handle RS256 without JWKS.
 * Validates JWT directly with Supabase for security.
 */
@Injectable()
export class JwtStrategy implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Decode JWT payload (without verification - we'll verify with Supabase)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );

      // Attach payload to request
      request.userPayload = payload;

      // Validate with Supabase (real security check - verifies RS256 signature)
      const user = await this.authService.validateToken(token);

      // Attach user to request with both id and userId for compatibility
      request.user = {
        ...user,
        userId: user.id, // Add userId alias for backward compatibility
      };

      console.log('[JwtStrategy] Token validated successfully:', {
        id: user?.id,
        userId: user?.id,
        email: user?.email,
      });

      return true;
    } catch (error) {
      console.error('[JwtStrategy] Auth failed:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

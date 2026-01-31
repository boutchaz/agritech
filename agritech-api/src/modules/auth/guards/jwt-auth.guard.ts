import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from '../strategies/jwt.strategy';

/**
 * JWT Auth Guard for Supabase
 *
 * Uses the custom JwtStrategy which validates tokens with Supabase directly.
 */
@Injectable()
export class JwtAuthGuard {
  constructor(
    private reflector: Reflector,
    private jwtStrategy: JwtStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requestId = (request as any).requestId || 'unknown';
    console.log(`[JwtAuthGuard #${requestId}] canActivate called for:`, request.url);

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('[JwtAuthGuard] Route is public, allowing access');
      return true;
    }

    console.log(`[JwtAuthGuard #${requestId}] Calling Supabase JWT strategy`);

    try {
      const result = await this.jwtStrategy.canActivate(context);
      console.log(`[JwtAuthGuard #${requestId}] canActivate result:`, result);
      return result;
    } catch (err) {
      console.error(`[JwtAuthGuard #${requestId}] Authentication failed:`, err.message);
      throw err;
    }
  }
}

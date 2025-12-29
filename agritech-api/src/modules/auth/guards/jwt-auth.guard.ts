import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
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

    console.log('[JwtAuthGuard] Calling passport JWT strategy');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const requestId = (request as any).requestId || 'unknown';
    console.log(`[JwtAuthGuard #${requestId}] handleRequest:`, {
      url: request.url,
      hasError: !!err,
      hasUser: !!user,
      userId: user?.id,
      info: info?.message || info,
    });

    if (err || !user) {
      console.error('[JwtAuthGuard] Authentication failed:', {
        error: err?.message || err,
        info: info?.message || info,
      });
      throw err || new UnauthorizedException('Authentication failed');
    }
    return user;
  }
}

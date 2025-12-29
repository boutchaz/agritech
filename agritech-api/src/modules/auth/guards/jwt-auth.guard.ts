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

    console.log(`[JwtAuthGuard #${requestId}] Calling passport JWT strategy`);
    const result = super.canActivate(context);

    // Log when the guard result is a Promise
    if (result instanceof Promise) {
      return result.then(res => {
        console.log(`[JwtAuthGuard #${requestId}] canActivate resolved to:`, res);
        return res;
      }).catch(err => {
        console.error(`[JwtAuthGuard #${requestId}] canActivate threw:`, err.message);
        throw err;
      });
    }

    console.log(`[JwtAuthGuard #${requestId}] canActivate returned:`, result);
    return result;
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

    // Attach user to request
    request.user = user;
    console.log(`[JwtAuthGuard #${requestId}] User attached to request, proceeding to next guard`);
    return user;
  }
}

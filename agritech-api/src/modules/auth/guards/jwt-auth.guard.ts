import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from '../strategies/jwt.strategy';

/**
 * JWT Auth Guard for Supabase
 *
 * Uses the custom JwtStrategy which validates tokens with Supabase directly.
 */
@Injectable()
export class JwtAuthGuard {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtStrategy: JwtStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    try {
      return await this.jwtStrategy.canActivate(context);
    } catch (err) {
      this.logger.debug(`Authentication failed for ${request.url}: ${err.message}`);
      throw err;
    }
  }
}

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../../database/database.service';

/**
 * Supabase JWT Guard
 *
 * Bypasses passport-jwt which cannot handle RS256 without JWKS.
 * Validates JWT directly with Supabase for security.
 * Resolves user's organizationId from organization_users table.
 */
@Injectable()
export class JwtStrategy implements CanActivate {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private authService: AuthService,
    private databaseService: DatabaseService,
  ) {}

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

      // Resolve organizationId from organization_users table
      let organizationId: string | null = null;
      try {
        const adminClient = this.databaseService.getAdminClient();
        const { data: orgUser } = await adminClient
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        organizationId = orgUser?.organization_id || null;
      } catch (orgError) {
        this.logger.warn(`Could not resolve organizationId for user ${user.id}: ${orgError.message}`);
      }

      // Attach user to request with id, userId, and organizationId
      request.user = {
        ...user,
        sub: user.id,    // Preserve JWT-style subject for legacy controllers
        userId: user.id, // Add userId alias for backward compatibility
        organizationId,   // Resolved from organization_users table
      };

      this.logger.debug(`Token validated: user=${user.id}, org=${organizationId}`);

      return true;
    } catch (error) {
      this.logger.error(`Auth failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../modules/database/database.service';

/**
 * Guard to ensure:
 * 1. Request includes an organizationId
 * 2. User is a member of that organization
 * 3. User has the required role level (if specified)
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract organizationId from request
    const organizationId =
      request.headers['x-organization-id'] ||
      request.query?.organizationId ||
      request.body?.organizationId;

    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required. Provide it via X-Organization-Id header, query param, or request body.',
      );
    }

    // Check if user is a member of the organization
    const isMember = await this.checkOrganizationMembership(
      user.id,
      organizationId,
    );

    if (!isMember) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    // Get required role level from metadata (if any)
    const requiredRoleLevel = this.reflector.get<number>(
      'requiredRoleLevel',
      context.getHandler(),
    );

    if (requiredRoleLevel) {
      const hasRequiredRole = await this.checkRoleLevel(
        user.id,
        organizationId,
        requiredRoleLevel,
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          'You do not have sufficient permissions for this operation',
        );
      }
    }

    // Attach organization info to request for later use
    request.organizationId = organizationId;

    return true;
  }

  /**
   * Check if user is a member of the organization
   */
  private async checkOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has required role level
   * Role levels: 1=system_admin, 2=organization_admin, 3=farm_manager, 4=farm_worker, 5=day_laborer, 6=viewer
   * Lower number = higher permission
   */
  private async checkRoleLevel(
    userId: string,
    organizationId: string,
    requiredLevel: number,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('role_id, roles(level)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    const userRoleLevel = (data.roles as any)?.level || 999;
    return userRoleLevel <= requiredLevel;
  }
}

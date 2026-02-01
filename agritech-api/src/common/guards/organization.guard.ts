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

    // Extract organizationId from request (check headers case-insensitively)
    const findHeaderValue = (headers: Record<string, any>, name: string): string | null => {
      const lowerName = name.toLowerCase();
      const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
      return key ? (headers[key] as string) : null;
    };

    const headerOrgId = findHeaderValue(request.headers, 'x-organization-id');
    
    const organizationId =
      headerOrgId ||
      request.query?.organizationId ||
      request.body?.organizationId;

    // Validate that organizationId is a valid UUID (not "undefined", "null", empty string, etc.)
    if (!organizationId || 
        organizationId === 'undefined' || 
        organizationId === 'null' || 
        organizationId.trim() === '') {
      throw new BadRequestException(
        'Organization ID is required. Provide it via X-Organization-Id header, query param, or request body.',
      );
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      throw new BadRequestException('Organization ID must be a valid UUID format');
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

    const requiredRoles = this.reflector.get<string[]>(
      'requiredRoles',
      context.getHandler(),
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = await this.checkUserRoles(
        user.id,
        organizationId,
        requiredRoles,
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          'You do not have sufficient permissions for this operation',
        );
      }
    }

    // Attach organization info to request for later use
    request.organizationId = organizationId;
    
    // Also attach to user object for convenience
    if (!user.organizationId) {
      user.organizationId = organizationId;
    }
    
    // Also set userId for convenience (if not already set)
    if (!user.userId && user.id) {
      user.userId = user.id;
    }

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

  private async checkUserRoles(
    userId: string,
    organizationId: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('role_id, roles(name)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    const userRole = (data.roles as any)?.name;
    return requiredRoles.includes(userRole);
  }
}

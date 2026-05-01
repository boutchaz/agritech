import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../modules/database/database.service';
import { SKIP_ORGANIZATION_GUARD_KEY } from '../decorators/skip-organization-guard.decorator';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipOrgGuard = this.reflector.getAllAndOverride<boolean>(SKIP_ORGANIZATION_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipOrgGuard) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract organizationId from request (supports path params, headers, query, and body)
    const findHeaderValue = (headers: Record<string, any>, name: string): string | null => {
      const lowerName = name.toLowerCase();
      const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
      return key ? (headers[key] as string) : null;
    };

    const headerOrgId = findHeaderValue(request.headers, 'x-organization-id');

    // Priority: header > already-set requestOrg > params > query
    // SECURITY: Do NOT accept organizationId from request body to prevent
    // guard/controller mismatch where the guard validates one org but the
    // controller reads a different one from the header.
    const organizationId =
      headerOrgId ||
      request.organizationId ||
      request.params?.organizationId ||
      request.params?.organization_id ||
      request.query?.organizationId ||
      request.query?.organization_id;

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

    if (!user.sub && user.id) {
      user.sub = user.id;
    }

    // Attach orgRole + workerId for downstream services to branch on
    // (e.g. self-service scoping in HR endpoints).
    const ctx = await this.loadOrgContext(user.id, organizationId);
    user.orgRole = ctx.orgRole;
    user.workerId = ctx.workerId;

    return true;
  }

  private async loadOrgContext(
    userId: string,
    organizationId: string,
  ): Promise<{ orgRole: string | null; workerId: string | null }> {
    const client = this.databaseService.getAdminClient();
    const [{ data: ouRow }, { data: workerRow }] = await Promise.all([
      client
        .from('organization_users')
        .select('roles(name)')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle(),
      client
        .from('workers')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .maybeSingle(),
    ]);
    return {
      orgRole: ((ouRow as any)?.roles?.name as string) ?? null,
      workerId: (workerRow as any)?.id ?? null,
    };
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

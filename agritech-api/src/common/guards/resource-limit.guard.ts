import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../modules/database/database.service';

/**
 * Metadata key for resource limit checks
 */
export const RESOURCE_LIMIT_KEY = 'resourceLimit';

/**
 * Resource types that can be limited by subscription
 */
export type LimitedResource = 'farms' | 'parcels' | 'users';

/**
 * Decorator to specify which resource limit to enforce.
 *
 * @example
 * @Post()
 * @ResourceLimit('farms')
 * @UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard, ResourceLimitGuard)
 * async create() { ... }
 */
export const ResourceLimit = (resource: LimitedResource) =>
  SetMetadata(RESOURCE_LIMIT_KEY, resource);

/**
 * Guard to enforce subscription resource limits (max_farms, max_parcels, max_users).
 *
 * Only checks on POST requests (resource creation). GET, PATCH, DELETE are allowed through.
 * Requires organizationId to be set on the request (by OrganizationGuard).
 *
 * Usage:
 * - Apply alongside @ResourceLimit('farms') decorator on creation endpoints
 * - Must be used after OrganizationGuard (needs organizationId on request)
 *
 * @example
 * @Post()
 * @ResourceLimit('farms')
 * @UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard, ResourceLimitGuard)
 * async createFarm() { ... }
 *
 * @example
 * @Post()
 * @ResourceLimit('parcels')
 * @UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard, ResourceLimitGuard)
 * async createParcel() { ... }
 *
 * @example
 * @Post()
 * @ResourceLimit('users')
 * @UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard, ResourceLimitGuard)
 * async inviteUser() { ... }
 */
@Injectable()
export class ResourceLimitGuard implements CanActivate {
  private readonly logger = new Logger(ResourceLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Only enforce limits on POST (creation) requests
    if (request.method !== 'POST') {
      return true;
    }

    // Read which resource to check from decorator metadata
    const resource = this.reflector.getAllAndOverride<LimitedResource>(
      RESOURCE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @ResourceLimit decorator — nothing to enforce
    if (!resource) {
      return true;
    }

    const organizationId = request.organizationId;

    if (!organizationId) {
      this.logger.warn('No organizationId in request, denying access');
      return false;
    }

    const adminClient = this.databaseService.getAdminClient();

    // Fetch subscription limits
    const limitColumn = `max_${resource}` as const;
    const { data: sub, error: subError } = await adminClient
      .from('subscriptions')
      .select(limitColumn)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subError) {
      this.logger.error(
        `Failed to fetch subscription for org ${organizationId}: ${subError.message}`,
      );
      return false;
    }

    const maxLimit = sub?.[limitColumn] as number | null;

    // No limit set (null) means unlimited
    if (maxLimit == null) {
      return true;
    }

    // Count current resources
    const currentCount = await this.countResource(
      adminClient,
      resource,
      organizationId,
    );

    if (currentCount >= maxLimit) {
      const resourceLabel = resource === 'users' ? 'users' : resource;
      this.logger.warn(
        `Resource limit reached for org ${organizationId}: ${currentCount}/${maxLimit} ${resourceLabel}`,
      );
      throw new ForbiddenException(
        `Plan limit reached: ${maxLimit} ${resourceLabel} maximum. Upgrade your plan.`,
      );
    }

    return true;
  }

  /**
   * Count current resources for the given organization.
   */
  private async countResource(
    adminClient: ReturnType<DatabaseService['getAdminClient']>,
    resource: LimitedResource,
    organizationId: string,
  ): Promise<number> {
    switch (resource) {
      case 'farms': {
        const { count } = await adminClient
          .from('farms')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        return count ?? 0;
      }

      case 'parcels': {
        const { count } = await adminClient
          .from('parcels')
          .select('id, farms!inner(organization_id)', {
            count: 'exact',
            head: true,
          })
          .eq('farms.organization_id', organizationId)
          .eq('is_active', true);
        return count ?? 0;
      }

      case 'users': {
        const { count } = await adminClient
          .from('organization_users')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        return count ?? 0;
      }

      default:
        this.logger.error(`Unknown resource type: ${resource}`);
        return 0;
    }
  }
}

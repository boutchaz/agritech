import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

/**
 * Metadata key to mark routes as public (no subscription check)
 */
export const PUBLIC_SUBSCRIPTION_KEY = 'publicSubscription';

/**
 * Guard to ensure organization has a valid subscription.
 *
 * Usage:
 * - Apply at controller level to protect all routes
 * - Apply at method level to protect specific routes
 * - Use @PublicSubscription() decorator to bypass check
 *
 * @example
 * @UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard)
 * export class FarmsController { ... }
 *
 * @example
 * @Get('usage')
 * @UseGuards(SubscriptionGuard)
 * async getUsage() { ... }
 *
 * @example
 * @Get('public-endpoint')
 * @PublicSubscription()
 * async publicMethod() { ... }
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public (bypass subscription check)
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.organizationId;

    // If no organizationId is present, DENY — subscription check requires org context
    if (!organizationId) {
      this.logger.warn('No organizationId in request, denying access');
      return false;
    }

    // Check subscription validity
    const hasValidSubscription =
      await this.subscriptionsService.hasValidSubscription(organizationId);

    if (!hasValidSubscription) {
      this.logger.warn(
        `Access blocked for organization ${organizationId}: No valid subscription`,
      );
      throw new ForbiddenException(
        'An active subscription is required to access this resource',
      );
    }

    return true;
  }
}

/**
 * Decorator to mark a route or controller as public (bypass subscription check)
 *
 * @example
 * @Get('settings')
 * @PublicSubscription()
 * async getSettings() { ... }
 */
export const PublicSubscription = () => SetMetadata(PUBLIC_SUBSCRIPTION_KEY, true);

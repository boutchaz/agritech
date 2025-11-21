import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract organizationId from request
 * Can be from header, query param, or body
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority:
    // 1. X-Organization-Id header (recommended)
    // 2. organizationId query parameter
    // 3. organizationId in body
    // 4. From user's current organization (if set in auth)

    const orgId =
      request.headers['x-organization-id'] ||
      request.query?.organizationId ||
      request.body?.organizationId ||
      request.user?.currentOrganizationId;

    return orgId;
  },
);

/**
 * Decorator to get the full organization object from request
 */
export const Organization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.organization;
  },
);

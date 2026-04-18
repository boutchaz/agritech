import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract organizationId from request
 * Can be from guard state, path params, headers, query params, or body
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority:
    // 1. Guard-resolved organizationId
    // 2. organizationId route parameter
    // 3. X-Organization-Id header
    // 4. organizationId query/body parameter
    // 5. From authenticated user context

    const orgId =
      request.organizationId ||
      request.params?.organizationId ||
      request.params?.organization_id ||
      request.headers['x-organization-id'] ||
      request.query?.organizationId ||
      request.query?.organization_id ||
      request.body?.organizationId ||
      request.body?.organization_id ||
      request.user?.organizationId ||
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

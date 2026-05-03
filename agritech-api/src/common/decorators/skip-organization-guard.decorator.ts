import { SetMetadata } from '@nestjs/common';

export const SKIP_ORGANIZATION_GUARD_KEY = 'skipOrganizationGuard';

/**
 * Skip the OrganizationGuard for endpoints that are user-scoped (not org-scoped).
 * The JwtAuthGuard still applies — the user must be authenticated.
 */
export const SkipOrganizationGuard = () => SetMetadata(SKIP_ORGANIZATION_GUARD_KEY, true);

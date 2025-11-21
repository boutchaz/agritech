import { SetMetadata } from '@nestjs/common';

/**
 * Role levels (lower = more permissions):
 * 1 = system_admin
 * 2 = organization_admin
 * 3 = farm_manager
 * 4 = farm_worker
 * 5 = day_laborer
 * 6 = viewer
 */
export enum RoleLevel {
  SYSTEM_ADMIN = 1,
  ORGANIZATION_ADMIN = 2,
  FARM_MANAGER = 3,
  FARM_WORKER = 4,
  DAY_LABORER = 5,
  VIEWER = 6,
}

export const REQUIRED_ROLE_LEVEL_KEY = 'requiredRoleLevel';

/**
 * Decorator to require minimum role level for endpoint
 * @param level - Minimum role level required (user must have this level or lower/higher permission)
 *
 * @example
 * @RequireRole(RoleLevel.ORGANIZATION_ADMIN) // Only org admins and system admins
 * @Post('create-user')
 * createUser() { ... }
 */
export const RequireRole = (level: RoleLevel) =>
  SetMetadata(REQUIRED_ROLE_LEVEL_KEY, level);

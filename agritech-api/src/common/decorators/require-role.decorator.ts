import { SetMetadata } from '@nestjs/common';

export enum RoleLevel {
  SYSTEM_ADMIN = 1,
  ORGANIZATION_ADMIN = 2,
  FARM_MANAGER = 3,
  FARM_WORKER = 4,
  DAY_LABORER = 5,
  VIEWER = 6,
}

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const RequireRole = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

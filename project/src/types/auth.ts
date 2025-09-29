export interface Role {
  id: string;
  name: 'system_admin' | 'organization_admin' | 'farm_manager' | 'farm_worker' | 'day_laborer' | 'viewer';
  display_name: string;
  description?: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  role_name: string;
  role_display_name: string;
  role_level: number;
}

export interface UserPermission {
  permission_name: string;
  resource: string;
  action: string;
}

export type ResourceType =
  | 'utilities'
  | 'users'
  | 'organizations'
  | 'farms'
  | 'parcels'
  | 'stock'
  | 'reports';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'manage';

export interface RoleHierarchy {
  system_admin: 1;
  organization_admin: 2;
  farm_manager: 3;
  farm_worker: 4;
  day_laborer: 5;
  viewer: 6;
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  system_admin: 1,
  organization_admin: 2,
  farm_manager: 3,
  farm_worker: 4,
  day_laborer: 5,
  viewer: 6,
};

export const ROLE_DESCRIPTIONS = {
  system_admin: 'Manages the entire platform and all organizations',
  organization_admin: 'Manages a specific organization, including its farms, users, and billing',
  farm_manager: 'Manages the day-to-day operations of a single farm',
  farm_worker: 'Regular employee with access to specific features relevant to their work',
  day_laborer: 'Temporary worker with very limited access for specific tasks',
  viewer: 'Read-only role for stakeholders, consultants, or observers',
} as const;
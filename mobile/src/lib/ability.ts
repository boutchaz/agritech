/**
 * CASL Ability Implementation for Mobile
 *
 * This provides permission checking based on abilities fetched from the backend.
 * The backend is the single source of truth for permissions.
 */

import type { AbilityRule, UserAbilities } from './api';

// Define all possible actions (matching backend Action enum)
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

// Define all possible subjects (matching backend Subject enum)
export type Subject =
  // User & Organization management
  | 'User' | 'Organization' | 'Role'
  // Physical resources
  | 'Farm' | 'Parcel' | 'Warehouse'
  // Financial resources
  | 'Invoice' | 'Payment' | 'JournalEntry' | 'Account'
  | 'Customer' | 'Supplier' | 'FinancialReport'
  // People & Workforce
  | 'Worker' | 'Task' | 'PieceWork'
  // Production
  | 'Harvest' | 'CropCycle' | 'ProductApplication' | 'Analysis'
  | 'SoilAnalysis' | 'PlantAnalysis' | 'WaterAnalysis'
  // Inventory
  | 'Product' | 'StockEntry' | 'StockItem' | 'BiologicalAsset'
  // Sales & Purchasing
  | 'SalesOrder' | 'PurchaseOrder' | 'Quote' | 'Delivery' | 'ReceptionBatch'
  // Quality & Lab
  | 'QualityControl' | 'LabService'
  // Pest & Disease
  | 'PestAlert'
  // Reporting & Analytics
  | 'Report' | 'SatelliteAnalysis' | 'ProductionIntelligence' | 'Dashboard'
  // Financial analytics
  | 'Cost' | 'Revenue' | 'Inventory'
  // System
  | 'all';

/**
 * Ability class that checks permissions based on rules from backend
 */
export class Ability {
  private rules: AbilityRule[];
  private roleLevel: number;

  constructor(abilities: UserAbilities | null) {
    this.rules = abilities?.abilities || [];
    this.roleLevel = abilities?.role?.level || 0;
  }

  /**
   * Check if an action is allowed on a subject
   */
  can(action: Action, subject: Subject): boolean {
    // First check for explicit denials (inverted rules)
    for (const rule of this.rules) {
      if (rule.inverted) {
        // Check for 'all' subject denial
        if (rule.subject === 'all' && (rule.action === action || rule.action === 'manage')) {
          return false;
        }
        // Check for specific subject denial
        if (rule.subject === subject && (rule.action === action || rule.action === 'manage')) {
          return false;
        }
      }
    }

    // Then check for explicit allows
    for (const rule of this.rules) {
      if (!rule.inverted) {
        // Check for 'all' subject permission
        if (rule.subject === 'all' && (rule.action === action || rule.action === 'manage')) {
          return true;
        }
        // Check for specific subject permission
        if (rule.subject === subject && (rule.action === action || rule.action === 'manage')) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if an action is NOT allowed on a subject
   */
  cannot(action: Action, subject: Subject): boolean {
    return !this.can(action, subject);
  }

  /**
   * Get the role level (useful for role-level comparisons)
   */
  getRoleLevel(): number {
    return this.roleLevel;
  }

  /**
   * Check if user has at least a certain role level
   * Higher level = more permissions (system_admin=100, viewer=10)
   */
  hasMinimumRoleLevel(minimumLevel: number): boolean {
    return this.roleLevel >= minimumLevel;
  }
}

/**
 * Create an Ability instance from backend abilities data
 */
export function createAbility(abilities: UserAbilities | null): Ability {
  return new Ability(abilities);
}

/**
 * Role level constants for comparison
 */
export const ROLE_LEVELS = {
  system_admin: 100,
  organization_admin: 80,
  farm_manager: 60,
  farm_worker: 40,
  day_laborer: 20,
  viewer: 10,
} as const;

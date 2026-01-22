import { Ability, AbilityBuilder } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../modules/database/database.service';
import { Action } from './action.enum';

// Define subjects for all resources in the system
export enum Subject {
    // User & Organization management
    USER = 'User',
    ORGANIZATION = 'Organization',
    ROLE = 'Role',

    // Physical resources
    FARM = 'Farm',
    PARCEL = 'Parcel',
    WAREHOUSE = 'Warehouse',

    // Financial resources
    INVOICE = 'Invoice',
    PAYMENT = 'Payment',
    JOURNAL_ENTRY = 'JournalEntry',
    ACCOUNT = 'Account',
    CUSTOMER = 'Customer',
    SUPPLIER = 'Supplier',
    FINANCIAL_REPORT = 'FinancialReport',

    // People & Workforce
    WORKER = 'Worker',
    TASK = 'Task',
    PIECE_WORK = 'PieceWork',

    // Production
    HARVEST = 'Harvest',
    CROP_CYCLE = 'CropCycle',
    PRODUCT_APPLICATION = 'ProductApplication',
    ANALYSIS = 'Analysis',
    SOIL_ANALYSIS = 'SoilAnalysis',
    PLANT_ANALYSIS = 'PlantAnalysis',
    WATER_ANALYSIS = 'WaterAnalysis',

    // Inventory
    PRODUCT = 'Product',
    STOCK_ENTRY = 'StockEntry',
    STOCK_ITEM = 'StockItem',
    BIOLOGICAL_ASSET = 'BiologicalAsset',

    // Sales & Purchasing
    SALES_ORDER = 'SalesOrder',
    PURCHASE_ORDER = 'PurchaseOrder',
    QUOTE = 'Quote',
    DELIVERY = 'Delivery',
    RECEPTION_BATCH = 'ReceptionBatch',

    // Quality & Lab
    QUALITY_CONTROL = 'QualityControl',
    LAB_SERVICE = 'LabService',

    // Reporting & Analytics
    REPORT = 'Report',
    SATELLITE_ANALYSIS = 'SatelliteAnalysis',
    PRODUCTION_INTELLIGENCE = 'ProductionIntelligence',
    DASHBOARD = 'Dashboard',

    // Financial analytics
    COST = 'Cost',
    REVENUE = 'Revenue',
    INVENTORY = 'Inventory',

    // System
    ALL = 'all',
}

// Allow both enum values and matching string literals for flexibility
export type AppSubjects = typeof Subject[keyof typeof Subject] | 'all' | string;

export type AppAbility = Ability<[Action, AppSubjects]>;

// Role levels for comparison
const ROLE_LEVELS: Record<string, number> = {
    system_admin: 100,
    organization_admin: 80,
    farm_manager: 60,
    farm_worker: 40,
    day_laborer: 20,
    viewer: 10,
};

/**
 * CASL Ability Factory - Server-side permission enforcement
 * This is the SINGLE SOURCE OF TRUTH for permissions.
 * Frontend permission checks are for UI ONLY - all actual enforcement happens here.
 */
@Injectable()
export class CaslAbilityFactory {
    constructor(private databaseService: DatabaseService) {}

    async createForUser(user: any, organizationId: string): Promise<AppAbility> {
        const { can, cannot, build } = new AbilityBuilder<AppAbility>(Ability as any);

        if (!user || !organizationId) {
            return build({
                detectSubjectType: (item: any) => item.constructor as any,
            } as any);
        }

        // Fetch user's role in this organization
        const client = this.databaseService.getAdminClient();
        const { data: orgUser, error } = await client
            .from('organization_users')
            .select('role_id, roles(name, level)')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .single();

        if (error || !orgUser) {
            console.error('[CaslAbilityFactory] Failed to fetch organization user:', {
                userId: user.id,
                organizationId,
                error: error?.message || 'No organization_users record found',
                errorCode: error?.code,
                errorDetails: error?.details,
                hint: error?.hint,
            });
            return build({
                detectSubjectType: (item: any) => item.constructor as any,
            } as any);
        }

        const role = orgUser.roles as any;
        const roleName = role?.name;
        const roleLevel = role?.level || 0;

        console.log('[CaslAbilityFactory] Creating ability for user:', {
            userId: user.id,
            organizationId,
            roleName,
            roleLevel,
        });

        // ============ SYSTEM ADMIN ============
        if (roleName === 'system_admin') {
            can(Action.Manage, Subject.ALL as any);
            console.log('[CaslAbilityFactory] System admin - full access granted');
        }
        // ============ ORGANIZATION ADMIN ============
        else if (roleName === 'organization_admin') {
            // Full access within organization (except system-level operations)
            can(Action.Manage, Subject.FARM);
            can(Action.Manage, Subject.PARCEL);
            can(Action.Manage, Subject.WAREHOUSE);
            can(Action.Manage, Subject.INVOICE);
            can(Action.Manage, Subject.PAYMENT);
            can(Action.Manage, Subject.JOURNAL_ENTRY);
            can(Action.Manage, Subject.ACCOUNT);
            can(Action.Manage, Subject.CUSTOMER);
            can(Action.Manage, Subject.SUPPLIER);
            can(Action.Manage, Subject.WORKER);
            can(Action.Manage, Subject.TASK);
            can(Action.Manage, Subject.PIECE_WORK);
            can(Action.Manage, Subject.HARVEST);
            can(Action.Manage, Subject.CROP_CYCLE);
            can(Action.Manage, Subject.PRODUCT_APPLICATION);
            can(Action.Manage, Subject.STOCK_ENTRY);
            can(Action.Manage, Subject.PRODUCT);
            can(Action.Manage, Subject.BIOLOGICAL_ASSET);
            can(Action.Manage, Subject.ANALYSIS);
            can(Action.Manage, Subject.SOIL_ANALYSIS);
            can(Action.Manage, Subject.PLANT_ANALYSIS);
            can(Action.Manage, Subject.WATER_ANALYSIS);
            can(Action.Manage, Subject.SALES_ORDER);
            can(Action.Manage, Subject.PURCHASE_ORDER);
            can(Action.Manage, Subject.QUOTE);
            can(Action.Manage, Subject.DELIVERY);
            can(Action.Manage, Subject.RECEPTION_BATCH);
            can(Action.Manage, Subject.QUALITY_CONTROL);
            can(Action.Manage, Subject.LAB_SERVICE);
            can(Action.Manage, Subject.FINANCIAL_REPORT);
            can(Action.Manage, Subject.REPORT);
            can(Action.Manage, Subject.SATELLITE_ANALYSIS);
            can(Action.Manage, Subject.PRODUCTION_INTELLIGENCE);
            can(Action.Read, Subject.USER); // Can view users in org
            can(Action.Update, Subject.USER); // Can manage user roles
            can(Action.Read, Subject.ORGANIZATION);
            can(Action.Update, Subject.ORGANIZATION); // Can update org settings
            can(Action.Manage, Subject.ROLE); // Can manage roles
            console.log('[CaslAbilityFactory] Organization admin - full org access granted');
        }
        // ============ FARM MANAGER ============
        else if (roleName === 'farm_manager') {
            // Can manage farm operations
            can(Action.Manage, Subject.FARM);
            can(Action.Manage, Subject.PARCEL);
            can(Action.Manage, Subject.WAREHOUSE);
            can(Action.Manage, Subject.TASK);
            can(Action.Manage, Subject.WORKER);
            can(Action.Manage, Subject.PIECE_WORK);
            can(Action.Manage, Subject.HARVEST);
            can(Action.Manage, Subject.CROP_CYCLE);
            can(Action.Manage, Subject.PRODUCT_APPLICATION);
            can(Action.Manage, Subject.PRODUCT);
            can(Action.Manage, Subject.BIOLOGICAL_ASSET);
            can(Action.Manage, Subject.ANALYSIS);
            can(Action.Manage, Subject.SOIL_ANALYSIS);
            can(Action.Manage, Subject.PLANT_ANALYSIS);
            can(Action.Manage, Subject.WATER_ANALYSIS);
            can(Action.Manage, Subject.STOCK_ENTRY);
            can(Action.Manage, Subject.DELIVERY);
            can(Action.Manage, Subject.RECEPTION_BATCH);
            can(Action.Manage, Subject.QUALITY_CONTROL);

            // Can create/view invoices and payments
            can(Action.Create, Subject.INVOICE);
            can(Action.Read, Subject.INVOICE);
            can(Action.Update, Subject.INVOICE); // Can edit drafts
            can(Action.Delete, Subject.INVOICE); // Can delete drafts only (enforced in service)

            can(Action.Create, Subject.PAYMENT);
            can(Action.Read, Subject.PAYMENT);
            can(Action.Update, Subject.PAYMENT);

            // Can manage quotes and orders
            can(Action.Create, Subject.QUOTE);
            can(Action.Read, Subject.QUOTE);
            can(Action.Update, Subject.QUOTE);
            can(Action.Delete, Subject.QUOTE);

            can(Action.Create, Subject.SALES_ORDER);
            can(Action.Read, Subject.SALES_ORDER);
            can(Action.Update, Subject.SALES_ORDER);

            can(Action.Create, Subject.PURCHASE_ORDER);
            can(Action.Read, Subject.PURCHASE_ORDER);
            can(Action.Update, Subject.PURCHASE_ORDER);

            // Limited access to financial records
            can(Action.Read, Subject.JOURNAL_ENTRY);
            can(Action.Read, Subject.ACCOUNT);
            can(Action.Read, Subject.CUSTOMER);
            can(Action.Read, Subject.SUPPLIER);
            can(Action.Read, Subject.FINANCIAL_REPORT);
            can(Action.Read, Subject.REPORT);
            can(Action.Read, Subject.SATELLITE_ANALYSIS);
            can(Action.Read, Subject.PRODUCTION_INTELLIGENCE);

            cannot(Action.Delete, Subject.JOURNAL_ENTRY); // Cannot delete journal entries
            cannot(Action.Manage, Subject.ACCOUNT); // Cannot manage chart of accounts

            console.log('[CaslAbilityFactory] Farm manager permissions granted');
        }
        // ============ FARM WORKER ============
        else if (roleName === 'farm_worker') {
            // Can view and update assigned tasks
            can(Action.Read, Subject.TASK);
            can(Action.Update, Subject.TASK); // Can update task status
            can(Action.Create, Subject.TASK); // Can create tasks

            // Can view farms and parcels
            can(Action.Read, Subject.FARM);
            can(Action.Read, Subject.PARCEL);
            can(Action.Read, Subject.WAREHOUSE);

            // Production access
            can(Action.Read, Subject.HARVEST);
            can(Action.Create, Subject.HARVEST);
            can(Action.Update, Subject.HARVEST);

            can(Action.Read, Subject.CROP_CYCLE);
            can(Action.Read, Subject.PRODUCT_APPLICATION);
            can(Action.Create, Subject.PRODUCT_APPLICATION);
            can(Action.Update, Subject.PRODUCT_APPLICATION);

            can(Action.Read, Subject.PRODUCT);
            can(Action.Read, Subject.BIOLOGICAL_ASSET);
            can(Action.Read, Subject.ANALYSIS);
            can(Action.Read, Subject.SOIL_ANALYSIS);
            can(Action.Read, Subject.PLANT_ANALYSIS);
            can(Action.Read, Subject.WATER_ANALYSIS);

            can(Action.Read, Subject.STOCK_ENTRY);
            can(Action.Create, Subject.STOCK_ENTRY);
            can(Action.Update, Subject.STOCK_ENTRY);

            can(Action.Read, Subject.DELIVERY);
            can(Action.Update, Subject.DELIVERY);
            can(Action.Read, Subject.RECEPTION_BATCH);
            can(Action.Update, Subject.RECEPTION_BATCH);

            can(Action.Read, Subject.QUALITY_CONTROL);
            can(Action.Create, Subject.QUALITY_CONTROL);

            // Cannot access financial operations
            cannot(Action.Create, Subject.INVOICE);
            cannot(Action.Update, Subject.INVOICE);
            cannot(Action.Delete, Subject.INVOICE);
            cannot(Action.Create, Subject.PAYMENT);
            cannot(Action.Update, Subject.PAYMENT);
            cannot(Action.Delete, Subject.PAYMENT);
            cannot(Action.Manage, Subject.JOURNAL_ENTRY);
            cannot(Action.Manage, Subject.ACCOUNT);
            cannot(Action.Manage, Subject.CUSTOMER);
            cannot(Action.Manage, Subject.SUPPLIER);
            cannot(Action.Create, Subject.SALES_ORDER);
            cannot(Action.Create, Subject.PURCHASE_ORDER);
            cannot(Action.Manage, Subject.FINANCIAL_REPORT);

            console.log('[CaslAbilityFactory] Farm worker permissions granted');
        }
        // ============ DAY LABORER ============
        else if (roleName === 'day_laborer') {
            // Very limited access - only assigned tasks
            can(Action.Read, Subject.TASK);
            can(Action.Update, Subject.TASK); // Can update task status/time

            // Basic view access
            can(Action.Read, Subject.FARM);
            can(Action.Read, Subject.PARCEL);
            can(Action.Read, Subject.HARVEST);
            can(Action.Read, Subject.PRODUCT);

            cannot(Action.Create, Subject.INVOICE);
            cannot(Action.Update, Subject.INVOICE);
            cannot(Action.Delete, Subject.INVOICE);
            cannot(Action.Create, Subject.PAYMENT);
            cannot(Action.Update, Subject.PAYMENT);
            cannot(Action.Delete, Subject.PAYMENT);
            cannot(Action.Manage, Subject.JOURNAL_ENTRY);
            cannot(Action.Manage, Subject.ACCOUNT);
            cannot(Action.Manage, Subject.CUSTOMER);
            cannot(Action.Manage, Subject.SUPPLIER);
            cannot(Action.Manage, Subject.WORKER);
            cannot(Action.Manage, Subject.FINANCIAL_REPORT);

            console.log('[CaslAbilityFactory] Day laborer permissions granted');
        }
        // ============ VIEWER ============
        else if (roleName === 'viewer') {
            // Read-only access to everything
            can(Action.Read, Subject.FARM);
            can(Action.Read, Subject.PARCEL);
            can(Action.Read, Subject.WAREHOUSE);
            can(Action.Read, Subject.INVOICE);
            can(Action.Read, Subject.PAYMENT);
            can(Action.Read, Subject.JOURNAL_ENTRY);
            can(Action.Read, Subject.ACCOUNT);
            can(Action.Read, Subject.CUSTOMER);
            can(Action.Read, Subject.SUPPLIER);
            can(Action.Read, Subject.WORKER);
            can(Action.Read, Subject.TASK);
            can(Action.Read, Subject.PIECE_WORK);
            can(Action.Read, Subject.HARVEST);
            can(Action.Read, Subject.CROP_CYCLE);
            can(Action.Read, Subject.PRODUCT_APPLICATION);
            can(Action.Read, Subject.STOCK_ENTRY);
            can(Action.Read, Subject.PRODUCT);
            can(Action.Read, Subject.BIOLOGICAL_ASSET);
            can(Action.Read, Subject.ANALYSIS);
            can(Action.Read, Subject.SOIL_ANALYSIS);
            can(Action.Read, Subject.PLANT_ANALYSIS);
            can(Action.Read, Subject.WATER_ANALYSIS);
            can(Action.Read, Subject.SALES_ORDER);
            can(Action.Read, Subject.PURCHASE_ORDER);
            can(Action.Read, Subject.QUOTE);
            can(Action.Read, Subject.DELIVERY);
            can(Action.Read, Subject.RECEPTION_BATCH);
            can(Action.Read, Subject.QUALITY_CONTROL);
            can(Action.Read, Subject.LAB_SERVICE);
            can(Action.Read, Subject.FINANCIAL_REPORT);
            can(Action.Read, Subject.REPORT);
            can(Action.Read, Subject.SATELLITE_ANALYSIS);
            can(Action.Read, Subject.PRODUCTION_INTELLIGENCE);
            can(Action.Read, Subject.USER);
            can(Action.Read, Subject.ORGANIZATION);
            can(Action.Read, Subject.ROLE);

            // Cannot modify anything
            cannot(Action.Create, Subject.ALL);
            cannot(Action.Update, Subject.ALL);
            cannot(Action.Delete, Subject.ALL);

            console.log('[CaslAbilityFactory] Viewer read-only permissions granted');
        }
        // ============ DEFAULT (unknown role) ============
        else {
            // Default to minimal read access for safety
            can(Action.Read, Subject.TASK);
            console.warn('[CaslAbilityFactory] Unknown role:', roleName, '- granting minimal read access');
        }

        const ability = build({
            detectSubjectType: (item: any) => item.constructor as any,
        } as any);

        // Log ability for debugging
        console.log('[CaslAbilityFactory] Ability created:', {
            userId: user.id,
            organizationId,
            roleName,
            canManageInvoices: ability.can(Action.Manage, Subject.INVOICE),
            canCreateInvoices: ability.can(Action.Create, Subject.INVOICE),
            canManagePayments: ability.can(Action.Manage, Subject.PAYMENT),
            canManageJournalEntries: ability.can(Action.Manage, Subject.JOURNAL_ENTRY),
        });

        return ability;
    }

    /**
     * Check if a user has a specific permission
     * Useful for quick checks without building full ability
     */
    async hasPermission(
        user: any,
        organizationId: string,
        action: Action,
        subject: Subject
    ): Promise<boolean> {
        const ability = await this.createForUser(user, organizationId);
        return ability.can(action, subject);
    }

    /**
     * Check if user has minimum role level
     */
    async hasMinimumRole(
        user: any,
        organizationId: string,
        minimumLevel: number
    ): Promise<boolean> {
        const client = this.databaseService.getAdminClient();
        const { data: orgUser } = await client
            .from('organization_users')
            .select('roles(level)')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .single();

        if (!orgUser) return false;
        const roleLevel = (orgUser.roles as any)?.level || 0;
        return roleLevel >= minimumLevel;
    }
}

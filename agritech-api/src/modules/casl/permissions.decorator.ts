import { SetMetadata } from '@nestjs/common';
import { Action } from './action.enum';
import { Subject } from './casl-ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';

/**
 * Policy handler class for checking specific permissions
 */
export class PermissionPolicyHandler {
    constructor(
        private action: Action,
        private subject: Subject
    ) {}

    handle(ability: any): boolean {
        return ability.can(this.action, this.subject);
    }
}

/**
 * Helper decorators for common permission checks
 * Usage:
 * @RequirePermission(Action.Create, Subject.INVOICE)
 * @Post()
 * async createInvoice() { ... }
 */
export const RequirePermission = (action: Action, subject: Subject) =>
    SetMetadata(CHECK_POLICIES_KEY, [new PermissionPolicyHandler(action, subject)]);

/**
 * Require multiple permissions (all must pass)
 */
export const RequirePermissions = (permissions: [Action, Subject][]) =>
    SetMetadata(
        CHECK_POLICIES_KEY,
        permissions.map(([action, subject]) => new PermissionPolicyHandler(action, subject))
    );

/**
 * Quick permission decorators for common operations
 */

// Invoice permissions
export const CanCreateInvoice = () => RequirePermission(Action.Create, Subject.INVOICE);
export const CanUpdateInvoice = () => RequirePermission(Action.Update, Subject.INVOICE);
export const CanDeleteInvoice = () => RequirePermission(Action.Delete, Subject.INVOICE);
export const CanManageInvoices = () => RequirePermission(Action.Manage, Subject.INVOICE);
export const CanReadInvoices = () => RequirePermission(Action.Read, Subject.INVOICE);

// Payment permissions
export const CanCreatePayment = () => RequirePermission(Action.Create, Subject.PAYMENT);
export const CanUpdatePayment = () => RequirePermission(Action.Update, Subject.PAYMENT);
export const CanDeletePayment = () => RequirePermission(Action.Delete, Subject.PAYMENT);
export const CanManagePayments = () => RequirePermission(Action.Manage, Subject.PAYMENT);
export const CanReadPayments = () => RequirePermission(Action.Read, Subject.PAYMENT);

// Journal entry permissions (financial records - restricted)
export const CanCreateJournalEntry = () => RequirePermission(Action.Create, Subject.JOURNAL_ENTRY);
export const CanUpdateJournalEntry = () => RequirePermission(Action.Update, Subject.JOURNAL_ENTRY);
export const CanManageJournalEntries = () => RequirePermission(Action.Manage, Subject.JOURNAL_ENTRY);
export const CanReadJournalEntries = () => RequirePermission(Action.Read, Subject.JOURNAL_ENTRY);

// Account permissions
export const CanManageAccounts = () => RequirePermission(Action.Manage, Subject.ACCOUNT);
export const CanReadAccounts = () => RequirePermission(Action.Read, Subject.ACCOUNT);

// Worker permissions
export const CanManageWorkers = () => RequirePermission(Action.Manage, Subject.WORKER);
export const CanReadWorkers = () => RequirePermission(Action.Read, Subject.WORKER);

// Task permissions
export const CanCreateTask = () => RequirePermission(Action.Create, Subject.TASK);
export const CanUpdateTask = () => RequirePermission(Action.Update, Subject.TASK);
export const CanDeleteTask = () => RequirePermission(Action.Delete, Subject.TASK);
export const CanManageTasks = () => RequirePermission(Action.Manage, Subject.TASK);
export const CanReadTasks = () => RequirePermission(Action.Read, Subject.TASK);

// Farm/Parcel permissions
export const CanManageFarms = () => RequirePermission(Action.Manage, Subject.FARM);
export const CanReadFarms = () => RequirePermission(Action.Read, Subject.FARM);
export const CanManageParcels = () => RequirePermission(Action.Manage, Subject.PARCEL);
export const CanReadParcels = () => RequirePermission(Action.Read, Subject.PARCEL);

// Organization permissions (admin only)
export const CanManageOrganization = () => RequirePermission(Action.Update, Subject.ORGANIZATION);
export const CanManageUsers = () => RequirePermission(Action.Update, Subject.USER);

// Report permissions
export const CanReadReports = () => RequirePermission(Action.Read, Subject.REPORT);

/**
 * Require a minimum role level
 * This is an additional check beyond CASL for role-level restrictions
 */
export const REQUIRE_ROLE_KEY = 'require_role';
export const RequireRole = (...roles: string[]) =>
    SetMetadata(REQUIRE_ROLE_KEY, roles);

/**
 * Require minimum role level
 */
export const REQUIRE_MIN_ROLE_LEVEL_KEY = 'require_min_role_level';
export const RequireMinRoleLevel = (level: number) =>
    SetMetadata(REQUIRE_MIN_ROLE_LEVEL_KEY, level);

/**
 * Common role requirements
 */
export const RequireAdmin = () => RequireRole('organization_admin', 'system_admin');
export const RequireManager = () => RequireRole('organization_admin', 'system_admin', 'farm_manager');
export const RequireWorker = () => RequireRole('organization_admin', 'system_admin', 'farm_manager', 'farm_worker');

// Worker CRUD permissions
export const CanCreateWorker = () => RequirePermission(Action.Create, Subject.WORKER);
export const CanUpdateWorker = () => RequirePermission(Action.Update, Subject.WORKER);
export const CanDeleteWorker = () => RequirePermission(Action.Delete, Subject.WORKER);

// Customer/Supplier permissions
export const CanManageCustomers = () => RequirePermission(Action.Manage, Subject.CUSTOMER);
export const CanReadCustomers = () => RequirePermission(Action.Read, Subject.CUSTOMER);
export const CanManageSuppliers = () => RequirePermission(Action.Manage, Subject.SUPPLIER);
export const CanReadSuppliers = () => RequirePermission(Action.Read, Subject.SUPPLIER);

// Sales order permissions
export const CanCreateSalesOrder = () => RequirePermission(Action.Create, Subject.SALES_ORDER);
export const CanUpdateSalesOrder = () => RequirePermission(Action.Update, Subject.SALES_ORDER);
export const CanDeleteSalesOrder = () => RequirePermission(Action.Delete, Subject.SALES_ORDER);
export const CanReadSalesOrders = () => RequirePermission(Action.Read, Subject.SALES_ORDER);

// Purchase order permissions
export const CanCreatePurchaseOrder = () => RequirePermission(Action.Create, Subject.PURCHASE_ORDER);
export const CanUpdatePurchaseOrder = () => RequirePermission(Action.Update, Subject.PURCHASE_ORDER);
export const CanDeletePurchaseOrder = () => RequirePermission(Action.Delete, Subject.PURCHASE_ORDER);
export const CanReadPurchaseOrders = () => RequirePermission(Action.Read, Subject.PURCHASE_ORDER);

// Quote permissions
export const CanCreateQuote = () => RequirePermission(Action.Create, Subject.QUOTE);
export const CanUpdateQuote = () => RequirePermission(Action.Update, Subject.QUOTE);
export const CanDeleteQuote = () => RequirePermission(Action.Delete, Subject.QUOTE);
export const CanReadQuotes = () => RequirePermission(Action.Read, Subject.QUOTE);

// Warehouse permissions
export const CanManageWarehouses = () => RequirePermission(Action.Manage, Subject.WAREHOUSE);
export const CanReadWarehouses = () => RequirePermission(Action.Read, Subject.WAREHOUSE);

// Product permissions
export const CanManageProducts = () => RequirePermission(Action.Manage, Subject.PRODUCT);
export const CanReadProducts = () => RequirePermission(Action.Read, Subject.PRODUCT);

// Stock entry permissions
export const CanCreateStockEntry = () => RequirePermission(Action.Create, Subject.STOCK_ENTRY);
export const CanUpdateStockEntry = () => RequirePermission(Action.Update, Subject.STOCK_ENTRY);
export const CanDeleteStockEntry = () => RequirePermission(Action.Delete, Subject.STOCK_ENTRY);
export const CanReadStockEntries = () => RequirePermission(Action.Read, Subject.STOCK_ENTRY);

// Biological asset permissions
export const CanManageBiologicalAssets = () => RequirePermission(Action.Manage, Subject.BIOLOGICAL_ASSET);
export const CanReadBiologicalAssets = () => RequirePermission(Action.Read, Subject.BIOLOGICAL_ASSET);

// Harvest permissions
export const CanManageHarvests = () => RequirePermission(Action.Manage, Subject.HARVEST);
export const CanReadHarvests = () => RequirePermission(Action.Read, Subject.HARVEST);

// Crop cycle permissions
export const CanManageCropCycles = () => RequirePermission(Action.Manage, Subject.CROP_CYCLE);
export const CanReadCropCycles = () => RequirePermission(Action.Read, Subject.CROP_CYCLE);

// Product application permissions
export const CanManageProductApplications = () => RequirePermission(Action.Manage, Subject.PRODUCT_APPLICATION);
export const CanReadProductApplications = () => RequirePermission(Action.Read, Subject.PRODUCT_APPLICATION);

// Analysis permissions
export const CanManageAnalyses = () => RequirePermission(Action.Manage, Subject.ANALYSIS);
export const CanReadAnalyses = () => RequirePermission(Action.Read, Subject.ANALYSIS);

// Quality control permissions
export const CanManageQualityControl = () => RequirePermission(Action.Manage, Subject.QUALITY_CONTROL);
export const CanReadQualityControl = () => RequirePermission(Action.Read, Subject.QUALITY_CONTROL);

// Delivery permissions
export const CanManageDeliveries = () => RequirePermission(Action.Manage, Subject.DELIVERY);
export const CanReadDeliveries = () => RequirePermission(Action.Read, Subject.DELIVERY);

// Reception batch permissions
export const CanManageReceptionBatches = () => RequirePermission(Action.Manage, Subject.RECEPTION_BATCH);
export const CanReadReceptionBatches = () => RequirePermission(Action.Read, Subject.RECEPTION_BATCH);

// Piece work permissions
export const CanManagePieceWork = () => RequirePermission(Action.Manage, Subject.PIECE_WORK);
export const CanReadPieceWork = () => RequirePermission(Action.Read, Subject.PIECE_WORK);

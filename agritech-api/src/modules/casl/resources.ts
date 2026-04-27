import { Subject } from './subject.enum';

/**
 * Single source of truth for permission-bearing resources.
 *
 * Add a new entry here to:
 *   - get a CASL Subject mapping (RESOURCE_SUBJECT_MAP, derived in casl-ability.factory.ts)
 *   - get DB permission rows seeded automatically (run `pnpm gen:perms` then `pnpm db:reset`)
 *
 * Each resource produces 5 permissions (read/create/update/delete/manage).
 *
 * Conventions:
 *   - `key`: snake_case plural matching DB `permissions.resource` value
 *   - `subject`: corresponding Subject enum entry (subject.enum.ts)
 *   - `displayName`: human label for the panel (singular or plural noun, no verbs)
 */
export interface ResourceDef {
    key: string;
    subject: Subject;
    displayName: string;
}

export const RESOURCES: readonly ResourceDef[] = [
    // User & org
    { key: 'users', subject: Subject.USER, displayName: 'Users' },
    { key: 'organizations', subject: Subject.ORGANIZATION, displayName: 'Organizations' },
    { key: 'roles', subject: Subject.ROLE, displayName: 'Roles' },
    { key: 'subscriptions', subject: Subject.SUBSCRIPTION, displayName: 'Subscriptions' },

    // Physical
    { key: 'farms', subject: Subject.FARM, displayName: 'Farms' },
    { key: 'parcels', subject: Subject.PARCEL, displayName: 'Parcels' },
    { key: 'warehouses', subject: Subject.WAREHOUSE, displayName: 'Warehouses' },
    { key: 'infrastructure', subject: Subject.INFRASTRUCTURE, displayName: 'Infrastructure' },
    { key: 'structures', subject: Subject.STRUCTURE, displayName: 'Structures' },
    { key: 'trees', subject: Subject.TREE, displayName: 'Trees' },
    { key: 'farm_hierarchy', subject: Subject.FARM_HIERARCHY, displayName: 'Farm Hierarchy' },

    // Financial
    { key: 'invoices', subject: Subject.INVOICE, displayName: 'Invoices' },
    { key: 'payments', subject: Subject.PAYMENT, displayName: 'Payments' },
    { key: 'journal_entries', subject: Subject.JOURNAL_ENTRY, displayName: 'Journal Entries' },
    { key: 'accounts', subject: Subject.ACCOUNT, displayName: 'Accounts' },
    { key: 'customers', subject: Subject.CUSTOMER, displayName: 'Customers' },
    { key: 'suppliers', subject: Subject.SUPPLIER, displayName: 'Suppliers' },
    { key: 'financial_reports', subject: Subject.FINANCIAL_REPORT, displayName: 'Financial Reports' },
    { key: 'cost_centers', subject: Subject.COST_CENTER, displayName: 'Cost Centers' },
    { key: 'taxes', subject: Subject.TAX, displayName: 'Taxes' },
    { key: 'bank_accounts', subject: Subject.BANK_ACCOUNT, displayName: 'Bank Accounts' },
    { key: 'periods', subject: Subject.PERIOD, displayName: 'Periods' },
    { key: 'accounting_reports', subject: Subject.ACCOUNTING_REPORT, displayName: 'Accounting Reports' },
    { key: 'account_mappings', subject: Subject.ACCOUNT_MAPPING, displayName: 'Account Mappings' },

    // People & workforce
    { key: 'workers', subject: Subject.WORKER, displayName: 'Workers' },
    { key: 'employees', subject: Subject.EMPLOYEE, displayName: 'Employees' },
    { key: 'day_laborers', subject: Subject.DAY_LABORER, displayName: 'Day Laborers' },
    { key: 'tasks', subject: Subject.TASK, displayName: 'Tasks' },
    { key: 'piece_works', subject: Subject.PIECE_WORK, displayName: 'Piece Works' },
    { key: 'work_units', subject: Subject.WORK_UNIT, displayName: 'Work Units' },

    // Production
    { key: 'harvests', subject: Subject.HARVEST, displayName: 'Harvests' },
    { key: 'crop_cycles', subject: Subject.CROP_CYCLE, displayName: 'Crop Cycles' },
    { key: 'campaigns', subject: Subject.CAMPAIGN, displayName: 'Campaigns' },
    { key: 'fiscal_years', subject: Subject.FISCAL_YEAR, displayName: 'Fiscal Years' },
    { key: 'product_applications', subject: Subject.PRODUCT_APPLICATION, displayName: 'Product Applications' },
    { key: 'analyses', subject: Subject.ANALYSIS, displayName: 'Analyses' },
    { key: 'soil_analyses', subject: Subject.SOIL_ANALYSIS, displayName: 'Soil Analyses' },
    { key: 'plant_analyses', subject: Subject.PLANT_ANALYSIS, displayName: 'Plant Analyses' },
    { key: 'water_analyses', subject: Subject.WATER_ANALYSIS, displayName: 'Water Analyses' },

    // Inventory & stock
    { key: 'products', subject: Subject.PRODUCT, displayName: 'Products' },
    { key: 'stock', subject: Subject.STOCK, displayName: 'Stock' },
    { key: 'stock_entries', subject: Subject.STOCK_ENTRY, displayName: 'Stock Entries' },
    { key: 'stock_items', subject: Subject.STOCK_ITEM, displayName: 'Stock Items' },
    { key: 'biological_assets', subject: Subject.BIOLOGICAL_ASSET, displayName: 'Biological Assets' },

    // Sales & purchasing
    { key: 'sales_orders', subject: Subject.SALES_ORDER, displayName: 'Sales Orders' },
    { key: 'purchase_orders', subject: Subject.PURCHASE_ORDER, displayName: 'Purchase Orders' },
    { key: 'quotes', subject: Subject.QUOTE, displayName: 'Quotes' },
    { key: 'deliveries', subject: Subject.DELIVERY, displayName: 'Deliveries' },
    { key: 'reception_batches', subject: Subject.RECEPTION_BATCH, displayName: 'Reception Batches' },

    // Quality & lab
    { key: 'quality_controls', subject: Subject.QUALITY_CONTROL, displayName: 'Quality Controls' },
    { key: 'lab_services', subject: Subject.LAB_SERVICE, displayName: 'Lab Services' },

    // Compliance
    { key: 'certifications', subject: Subject.CERTIFICATION, displayName: 'Certifications' },
    { key: 'compliance_checks', subject: Subject.COMPLIANCE_CHECK, displayName: 'Compliance Checks' },

    // Reporting & analytics
    { key: 'reports', subject: Subject.REPORT, displayName: 'Reports' },
    { key: 'satellite_analyses', subject: Subject.SATELLITE_ANALYSIS, displayName: 'Satellite Analyses' },
    { key: 'satellite_reports', subject: Subject.SATELLITE_REPORT, displayName: 'Satellite Reports' },
    { key: 'production_intelligence', subject: Subject.PRODUCTION_INTELLIGENCE, displayName: 'Production Intelligence' },
    { key: 'dashboard', subject: Subject.DASHBOARD, displayName: 'Dashboard' },
    { key: 'analytics', subject: Subject.ANALYTICS, displayName: 'Analytics' },
    { key: 'sensors', subject: Subject.SENSOR, displayName: 'Sensors' },

    // Financial analytics
    { key: 'costs', subject: Subject.COST, displayName: 'Costs' },
    { key: 'revenues', subject: Subject.REVENUE, displayName: 'Revenues' },
    { key: 'inventory', subject: Subject.INVENTORY, displayName: 'Inventory' },
    { key: 'utilities', subject: Subject.UTILITY, displayName: 'Utilities' },

    // Agronomy RAG
    { key: 'agronomy_sources', subject: Subject.AGRONOMY_SOURCE, displayName: 'Agronomy Sources' },

    // Comms / config / API
    { key: 'chat', subject: Subject.CHAT, displayName: 'Chat' },
    { key: 'settings', subject: Subject.SETTINGS, displayName: 'Settings' },
    { key: 'api', subject: Subject.API, displayName: 'API' },
];

export const RESOURCE_SUBJECT_MAP: Record<string, Subject> = Object.freeze(
    RESOURCES.reduce<Record<string, Subject>>((acc, r) => {
        acc[r.key] = r.subject;
        return acc;
    }, {}),
);

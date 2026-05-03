// Subject enum: every domain entity that CASL can guard.
// Adding a new entry here is step 1 of 2 — also append to RESOURCES in resources.ts
// so the DB seed and RESOURCE_SUBJECT_MAP pick it up automatically.
export enum Subject {
    // User & Organization management
    USER = 'User',
    ORGANIZATION = 'Organization',
    ROLE = 'Role',
    SUBSCRIPTION = 'Subscription',

    // Physical resources
    FARM = 'Farm',
    PARCEL = 'Parcel',
    WAREHOUSE = 'Warehouse',
    INFRASTRUCTURE = 'Infrastructure',
    STRUCTURE = 'Structure',
    TREE = 'Tree',
    FARM_HIERARCHY = 'FarmHierarchy',

    // Financial resources
    INVOICE = 'Invoice',
    PAYMENT = 'Payment',
    JOURNAL_ENTRY = 'JournalEntry',
    ACCOUNT = 'Account',
    CUSTOMER = 'Customer',
    SUPPLIER = 'Supplier',
    FINANCIAL_REPORT = 'FinancialReport',
    COST_CENTER = 'CostCenter',
    TAX = 'Tax',
    BANK_ACCOUNT = 'BankAccount',
    PERIOD = 'Period',
    ACCOUNTING_REPORT = 'AccountingReport',
    ACCOUNT_MAPPING = 'AccountMapping',

    // People & Workforce
    WORKER = 'Worker',
    EMPLOYEE = 'Employee',
    DAY_LABORER = 'DayLaborer',
    TASK = 'Task',
    PIECE_WORK = 'PieceWork',
    WORK_UNIT = 'WorkUnit',

    // Production
    HARVEST = 'Harvest',
    CROP_CYCLE = 'CropCycle',
    CAMPAIGN = 'Campaign',
    FISCAL_YEAR = 'FiscalYear',
    PRODUCT_APPLICATION = 'ProductApplication',
    ANALYSIS = 'Analysis',
    SOIL_ANALYSIS = 'SoilAnalysis',
    PLANT_ANALYSIS = 'PlantAnalysis',
    WATER_ANALYSIS = 'WaterAnalysis',

    // Inventory & Stock
    PRODUCT = 'Product',
    STOCK = 'Stock',
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

    // Compliance
    CERTIFICATION = 'Certification',
    COMPLIANCE_CHECK = 'ComplianceCheck',

    // Reporting & Analytics
    REPORT = 'Report',
    SATELLITE_ANALYSIS = 'SatelliteAnalysis',
    SATELLITE_REPORT = 'SatelliteReport',
    PRODUCTION_INTELLIGENCE = 'ProductionIntelligence',
    DASHBOARD = 'Dashboard',
    ANALYTICS = 'Analytics',
    SENSOR = 'Sensor',

    // Financial analytics
    COST = 'Cost',
    REVENUE = 'Revenue',
    INVENTORY = 'Inventory',
    UTILITY = 'Utility',

    // Equipment & Fleet
    EQUIPMENT = 'Equipment',

    // Petty / unjustified expenses (charges non justifiées)
    PETTY_EXPENSE = 'PettyExpense',

    // Agronomy RAG
    AGRONOMY_SOURCE = 'AgronomySource',

    // Communication
    CHAT = 'Chat',

    // Settings & Configuration
    SETTINGS = 'Settings',

    // HR
    HR_COMPLIANCE = 'HrCompliance',
    LEAVE_TYPE = 'LeaveType',
    LEAVE_ALLOCATION = 'LeaveAllocation',
    LEAVE_APPLICATION = 'LeaveApplication',
    LEAVE_BLOCK_DATE = 'LeaveBlockDate',
    LEAVE_ENCASHMENT = 'LeaveEncashment',
    HOLIDAY = 'Holiday',
    SALARY_STRUCTURE = 'SalaryStructure',
    SALARY_SLIP = 'SalarySlip',
    PAYROLL_RUN = 'PayrollRun',
    WORKER_DOCUMENT = 'WorkerDocument',
    SHIFT = 'Shift',
    SHIFT_ASSIGNMENT = 'ShiftAssignment',
    SHIFT_REQUEST = 'ShiftRequest',
    ONBOARDING = 'Onboarding',
    SEPARATION = 'Separation',
    EXPENSE_CLAIM = 'ExpenseClaim',
    EXPENSE_CATEGORY = 'ExpenseCategory',
    JOB_OPENING = 'JobOpening',
    JOB_APPLICANT = 'JobApplicant',
    INTERVIEW = 'Interview',
    APPRAISAL_CYCLE = 'AppraisalCycle',
    APPRAISAL = 'Appraisal',
    PERFORMANCE_FEEDBACK = 'PerformanceFeedback',
    SEASONAL_CAMPAIGN = 'SeasonalCampaign',
    WORKER_QUALIFICATION = 'WorkerQualification',
    SAFETY_INCIDENT = 'SafetyIncident',
    WORKER_TRANSPORT = 'WorkerTransport',
    GRIEVANCE = 'Grievance',
    TRAINING_PROGRAM = 'TrainingProgram',
    TRAINING_ENROLLMENT = 'TrainingEnrollment',

    // API
    API = 'API',

    // System
    ALL = 'all',
}

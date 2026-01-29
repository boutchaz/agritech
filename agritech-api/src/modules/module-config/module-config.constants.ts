/**
 * Static Module Configuration
 * Single source of truth for module definitions, pricing, and UI config
 * This replaces database-driven configuration for easier maintenance
 */

export interface StaticModuleConfig {
  slug: string;
  icon: string;
  color: string;
  category: string;
  displayOrder: number;
  priceMonthly: number;
  isRequired: boolean;
  isRecommended: boolean;
  isAddonEligible: boolean;
  isAvailable: boolean;
  dashboardWidgets: string[];
  navigationItems: string[];
  features: { [locale: string]: string[] };
}

export interface StaticTranslation {
  [locale: string]: {
    name: string;
    description: string;
    features: string[];
  };
}

export const MODULE_CONFIGS: Record<string, StaticModuleConfig> = {
  farm_management: {
    slug: 'farm_management',
    icon: 'MapPin',
    color: 'emerald',
    category: 'core',
    displayOrder: 1,
    priceMonthly: 0,
    isRequired: true,
    isRecommended: true,
    isAddonEligible: false,
    isAvailable: true,
    dashboardWidgets: ['parcels', 'farm', 'tasks', 'harvests'],
    navigationItems: ['/farms', '/parcels', '/harvests', '/campaigns', '/crop-cycles', '/reception-batches', '/quality-control', '/structures'],
    features: {
      en: ['Parcel management', 'Crop tracking', 'Task scheduling', 'Harvest recording', 'Campaign management', 'Production tracking'],
      fr: ['Gestion des parcelles', 'Suivi des cultures', 'Planification des tâches', 'Enregistrement des récoltes', 'Gestion des campagnes', 'Suivi de production'],
      ar: ['إدارة القطع', 'تتبع المحاصيل', 'جدولة المهام', 'تسجيل الحصاد', 'إدارة الحملات', 'تتبع الإنتاج'],
    },
  },
  inventory: {
    slug: 'inventory',
    icon: 'Package',
    color: 'blue',
    category: 'operations',
    displayOrder: 2,
    priceMonthly: 8,
    isRequired: false,
    isRecommended: true,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['stock', 'alerts'],
    navigationItems: ['/stock', '/warehouses', '/items'],
    features: {
      en: ['Warehouse management', 'Stock tracking', 'Low stock alerts', 'Movement history'],
      fr: ['Gestion des entrepôts', 'Suivi des stocks', 'Alertes de stock bas', 'Historique des mouvements'],
      ar: ['إدارة المستودعات', 'تتبع المخزون', 'تنبيهات انخفاض المخزون', 'سجل الحركات'],
    },
  },
  sales: {
    slug: 'sales',
    icon: 'ShoppingCart',
    color: 'purple',
    category: 'finance',
    displayOrder: 3,
    priceMonthly: 10,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['sales'],
    navigationItems: ['/customers', '/quotes', '/sales-orders', '/invoices'],
    features: {
      en: ['Customer management', 'Quote creation', 'Order processing', 'Invoice generation'],
      fr: ['Gestion des clients', 'Création de devis', 'Traitement des commandes', 'Génération de factures'],
      ar: ['إدارة العملاء', 'إنشاء العروض', 'معالجة الطلبات', 'إنشاء الفواتير'],
    },
  },
  procurement: {
    slug: 'procurement',
    icon: 'Truck',
    color: 'orange',
    category: 'operations',
    displayOrder: 4,
    priceMonthly: 8,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/suppliers', '/purchase-orders'],
    features: {
      en: ['Supplier management', 'Purchase orders', 'Delivery tracking'],
      fr: ['Gestion des fournisseurs', 'Bons de commande', 'Suivi des livraisons'],
      ar: ['إدارة الموردين', 'أوامر الشراء', 'تتبع التسليم'],
    },
  },
  accounting: {
    slug: 'accounting',
    icon: 'Receipt',
    color: 'indigo',
    category: 'finance',
    displayOrder: 5,
    priceMonthly: 12,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['financial', 'accounting'],
    navigationItems: ['/accounts', '/journal-entries', '/financial-reports', '/invoices', '/payments', '/utilities'],
    features: {
      en: ['Chart of accounts', 'Journal entries', 'Financial reports', 'Bank reconciliation', 'Invoice management', 'Payment tracking'],
      fr: ['Plan comptable', 'Écritures comptables', 'Rapports financiers', 'Rapprochement bancaire', 'Gestion des factures', 'Suivi des paiements'],
      ar: ['دليل الحسابات', 'القيود المحاسبية', 'التقارير المالية', 'المطابقة البنكية', 'إدارة الفواتير', 'تتبع المدفوعات'],
    },
  },
  hr: {
    slug: 'hr',
    icon: 'Users',
    color: 'pink',
    category: 'operations',
    displayOrder: 6,
    priceMonthly: 10,
    isRequired: false,
    isRecommended: true,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['workers'],
    navigationItems: ['/workers', '/piece-work', '/work-units', '/tasks'],
    features: {
      en: ['Employee management', 'Attendance tracking', 'Payroll', 'Work assignments', 'Task management'],
      fr: ['Gestion des employés', 'Suivi des présences', 'Paie', 'Affectation des tâches', 'Gestion des tâches'],
      ar: ['إدارة الموظفين', 'تتبع الحضور', 'الرواتب', 'تعيين المهام', 'إدارة المهام'],
    },
  },
  analytics: {
    slug: 'analytics',
    icon: 'Satellite',
    color: 'cyan',
    category: 'analytics',
    displayOrder: 7,
    priceMonthly: 20,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['soil', 'production'],
    navigationItems: ['/satellite-indices', '/soil-analyses', '/reports', '/alerts', '/chat'],
    features: {
      en: ['Satellite imagery', 'NDVI analysis', 'Crop health monitoring', 'Predictive analytics', 'Alert management', 'AI assistant'],
      fr: ['Imagerie satellite', 'Analyse NDVI', 'Surveillance de la santé des cultures', 'Analyses prédictives', 'Gestion des alertes', 'Assistant IA'],
      ar: ['صور الأقمار الصناعية', 'تحليل NDVI', 'مراقبة صحة المحاصيل', 'التحليلات التنبؤية', 'إدارة التنبيهات', 'المساعد الذكي'],
    },
  },
  compliance: {
    slug: 'compliance',
    icon: 'ShieldCheck',
    color: 'violet',
    category: 'compliance',
    displayOrder: 9,
    priceMonthly: 15,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/compliance', '/certifications'],
    features: {
      en: ['Certification management', 'Compliance tracking', 'Document storage', 'Reminder system'],
      fr: ['Gestion des certifications', 'Suivi de la conformité', 'Stockage de documents', 'Système de rappel'],
      ar: ['إدارة الشهادات', 'تتبع الامتثال', 'تخزين المستندات', 'نظام التذكير'],
    },
  },
  marketplace: {
    slug: 'marketplace',
    icon: 'Building',
    color: 'green',
    category: 'marketplace',
    displayOrder: 8,
    priceMonthly: 15,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/marketplace'],
    features: {
      en: ['Product listings', 'Online store', 'Order management', 'Payment processing'],
      fr: ['Catalogues produits', 'Boutique en ligne', 'Gestion des commandes', 'Traitement des paiements'],
      ar: ['قوائم المنتجات', 'المتجر الإلكتروني', 'إدارة الطلبات', 'معالجة الدفعات'],
    },
  },
};

export const SUBSCRIPTION_PRICING = {
  basePriceMonthly: 15,
  trialDays: 14,
  addonSlotPrice: 5,
};

export const WIDGET_TO_MODULE_MAP: Record<string, string> = {};

// Build widget to module map
for (const [slug, config] of Object.entries(MODULE_CONFIGS)) {
  for (const widget of config.dashboardWidgets) {
    WIDGET_TO_MODULE_MAP[widget] = slug;
  }
}

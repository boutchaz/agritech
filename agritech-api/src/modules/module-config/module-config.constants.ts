/**
 * Static Module Configuration
 * NOTE: The canonical module list is in admin.service.ts loadDefaultModules().
 * This file is used only for pricing/widget mapping. Keep navigationItems in sync.
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
  core: {
    slug: 'core',
    icon: 'Home',
    color: 'emerald',
    category: 'core',
    displayOrder: 1,
    priceMonthly: 0,
    isRequired: true,
    isRecommended: true,
    isAddonEligible: false,
    isAvailable: true,
    dashboardWidgets: ['parcels', 'farm'],
    navigationItems: ['/dashboard','/settings','/farm-hierarchy','/parcels','/notifications','/analytics','/live-dashboard','/referentiels','/reports','/pest-alerts'],
    features: {
      en: ['Dashboard', 'Farm hierarchy', 'Parcel management', 'Notifications', 'Analytics', 'Reports'],
      fr: ['Tableau de bord', 'Hiérarchie agricole', 'Gestion des parcelles', 'Notifications', 'Analytique', 'Rapports'],
      ar: ['لوحة القيادة', 'التسلسل الزراعي', 'إدارة القطع', 'الإشعارات', 'التحليلات', 'التقارير'],
    },
  },
  chat_advisor: {
    slug: 'chat_advisor',
    icon: 'Bot',
    color: 'emerald',
    category: 'analytics',
    displayOrder: 2,
    priceMonthly: 0,
    isRequired: true,
    isRecommended: true,
    isAddonEligible: false,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/chat'],
    features: {
      en: ['AI chat assistant'],
      fr: ['Assistant IA conversationnel'],
      ar: ['مساعد الدردشة الذكي'],
    },
  },
  agromind_advisor: {
    slug: 'agromind_advisor',
    icon: 'Sparkles',
    color: 'purple',
    category: 'analytics',
    displayOrder: 3,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/parcels/$parcelId/ai'],
    features: {
      en: ['AI advisor per parcel', 'Calibration', 'Diagnostics', 'Recommendations', 'Annual plan'],
      fr: ['Conseiller IA par parcelle', 'Calibration', 'Diagnostics', 'Recommandations', 'Plan annuel'],
      ar: ['مستشار ذكي لكل قطعة', 'المعايرة', 'التشخيص', 'التوصيات', 'الخطة السنوية'],
    },
  },
  satellite: {
    slug: 'satellite',
    icon: 'Satellite',
    color: 'cyan',
    category: 'analytics',
    displayOrder: 4,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['soil', 'production'],
    navigationItems: ['/satellite-analysis','/production/satellite-analysis','/parcels/$parcelId/satellite','/parcels/$parcelId/weather','/production/soil-analysis'],
    features: {
      en: ['Satellite imagery', 'Vegetation indices', 'Weather data', 'Soil analysis'],
      fr: ['Imagerie satellite', 'Indices de végétation', 'Données météo', 'Analyse du sol'],
      ar: ['صور الأقمار الصناعية', 'مؤشرات الغطاء النباتي', 'البيانات الجوية', 'تحليل التربة'],
    },
  },
  personnel: {
    slug: 'personnel',
    icon: 'Users',
    color: 'blue',
    category: 'hr',
    displayOrder: 5,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['workers', 'tasks'],
    navigationItems: ['/workers','/tasks','/workforce/payments','/workforce/workers/piece-work','/workforce/day-laborers','/workforce/employees','/workforce/tasks'],
    features: {
      en: ['Worker management', 'Task scheduling', 'Payroll', 'Piece-work tracking'],
      fr: ['Gestion des travailleurs', 'Planification des tâches', 'Paie', 'Suivi au rendement'],
      ar: ['إدارة العمال', 'جدولة المهام', 'الرواتب', 'تتبع العمل بالقطعة'],
    },
  },
  stock: {
    slug: 'stock',
    icon: 'Package',
    color: 'emerald',
    category: 'inventory',
    displayOrder: 6,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['stock', 'alerts'],
    navigationItems: ['/stock','/infrastructure','/inventory'],
    features: {
      en: ['Stock management', 'Warehouse tracking', 'Infrastructure', 'Inventory'],
      fr: ['Gestion des stocks', 'Suivi des entrepôts', 'Infrastructure', 'Inventaire'],
      ar: ['إدارة المخزون', 'تتبع المستودعات', 'البنية التحتية', 'الجرد'],
    },
  },
  production: {
    slug: 'production',
    icon: 'Wheat',
    color: 'amber',
    category: 'production',
    displayOrder: 7,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['harvests'],
    navigationItems: ['/campaigns','/crop-cycles','/harvests','/reception-batches','/quality-control','/biological-assets','/product-applications','/production/crop-cycles','/production/intelligence','/production/profitability','/production/quality-control'],
    features: {
      en: ['Campaign management', 'Crop cycles', 'Harvests', 'Quality control', 'Biological assets', 'Product applications'],
      fr: ['Gestion des campagnes', 'Cycles de culture', 'Récoltes', 'Contrôle qualité', 'Actifs biologiques', 'Applications de produits'],
      ar: ['إدارة الحملات', 'دورات المحاصيل', 'الحصاد', 'مراقبة الجودة', 'الأصول البيولوجية', 'تطبيقات المنتجات'],
    },
  },
  fruit_trees: {
    slug: 'fruit_trees',
    icon: 'TreeDeciduous',
    color: 'emerald',
    category: 'agriculture',
    displayOrder: 8,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/trees', '/orchards', '/pruning'],
    features: {
      en: ['Tree management', 'Orchard tracking', 'Pruning scheduling'],
      fr: ['Gestion des arbres', 'Suivi des vergers', 'Planification de la taille'],
      ar: ['إدارة الأشجار', 'تتبع البساتين', 'جدولة التقليم'],
    },
  },
  compliance: {
    slug: 'compliance',
    icon: 'ShieldCheck',
    color: 'violet',
    category: 'operations',
    displayOrder: 9,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/compliance'],
    features: {
      en: ['Certification management', 'Compliance tracking', 'Corrective actions'],
      fr: ['Gestion des certifications', 'Suivi de la conformité', 'Actions correctives'],
      ar: ['إدارة الشهادات', 'تتبع الامتثال', 'الإجراءات التصحيحية'],
    },
  },
  sales_purchasing: {
    slug: 'sales_purchasing',
    icon: 'ShoppingCart',
    color: 'rose',
    category: 'sales',
    displayOrder: 10,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['sales'],
    navigationItems: ['/accounting/quotes','/accounting/sales-orders','/accounting/purchase-orders','/accounting/customers','/stock/suppliers'],
    features: {
      en: ['Quotes', 'Sales orders', 'Purchase orders', 'Customer management', 'Supplier management'],
      fr: ['Devis', 'Commandes de vente', 'Bons de commande', 'Gestion des clients', 'Gestion des fournisseurs'],
      ar: ['عروض الأسعار', 'أوامر البيع', 'أوامر الشراء', 'إدارة العملاء', 'إدارة الموردين'],
    },
  },
  accounting: {
    slug: 'accounting',
    icon: 'BookOpen',
    color: 'indigo',
    category: 'accounting',
    displayOrder: 11,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: ['financial', 'accounting'],
    navigationItems: ['/accounting', '/utilities'],
    features: {
      en: ['Chart of accounts', 'Journal entries', 'Invoices', 'Payments', 'Financial reports', 'Utilities'],
      fr: ['Plan comptable', 'Écritures comptables', 'Factures', 'Paiements', 'Rapports financiers', 'Services'],
      ar: ['دليل الحسابات', 'القيود المحاسبية', 'الفواتير', 'المدفوعات', 'التقارير المالية', 'الخدمات'],
    },
  },
  marketplace: {
    slug: 'marketplace',
    icon: 'ShoppingBag',
    color: 'orange',
    category: 'sales',
    displayOrder: 12,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/marketplace'],
    features: {
      en: ['B2B marketplace', 'Quote requests', 'Order management'],
      fr: ['Marketplace B2B', 'Demandes de devis', 'Gestion des commandes'],
      ar: ['سوق B2B', 'طلبات عروض الأسعار', 'إدارة الطلبات'],
    },
  },
  lab_services: {
    slug: 'lab_services',
    icon: 'FlaskConical',
    color: 'purple',
    category: 'operations',
    displayOrder: 13,
    priceMonthly: 0,
    isRequired: false,
    isRecommended: false,
    isAddonEligible: true,
    isAvailable: true,
    dashboardWidgets: [],
    navigationItems: ['/lab-services'],
    features: {
      en: ['Lab services', 'Soil analysis marketplace', 'Sample collection scheduling'],
      fr: ['Services de laboratoire', 'Marketplace d\'analyses', 'Planification des prélèvements'],
      ar: ['خدمات المختبر', 'سوق التحاليل', 'جدولة جمع العينات'],
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

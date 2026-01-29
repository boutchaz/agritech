/**
 * @deprecated This file is deprecated. Use useModuleConfig() hook instead.
 * 
 * Module configuration is now database-driven. The source of truth is:
 * - Database: modules table + module_translations table
 * - API: GET /api/v1/module-config
 * - Frontend: useModuleConfig() hook from @/hooks/useModuleConfig
 * 
 * This file is kept for backwards compatibility and as a fallback reference.
 * Do NOT add new code that imports from this file.
 */

import {
  MapPin,
  Package,
  ShoppingCart,
  Users,
  Building,
  Truck,
  Receipt,
  Satellite,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  icon: LucideIcon;
  color: string;
  category: 'core' | 'operations' | 'finance' | 'analytics' | 'marketplace';
  priceMonthly: number;
  isRequired: boolean;
  isRecommended: boolean;
  dashboardWidgets: string[];
  navigationItems: string[];
  features: string[];
}

export const BASE_SUBSCRIPTION_PRICE = 15;

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  farm_management: {
    id: 'farm_management',
    name: 'Farm Management',
    nameKey: 'modules.farm_management.name',
    description: 'Parcels, crops, tasks and harvests',
    descriptionKey: 'modules.farm_management.description',
    icon: MapPin,
    color: 'emerald',
    category: 'core',
    priceMonthly: 0,
    isRequired: true,
    isRecommended: true,
    dashboardWidgets: ['parcels', 'farm', 'tasks', 'harvests'],
    navigationItems: ['/farms', '/parcels', '/tasks', '/harvests'],
    features: ['Parcel management', 'Crop tracking', 'Task scheduling', 'Harvest recording'],
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory & Stock',
    nameKey: 'modules.inventory.name',
    description: 'Warehouses, items and stock movements',
    descriptionKey: 'modules.inventory.description',
    icon: Package,
    color: 'blue',
    category: 'operations',
    priceMonthly: 8,
    isRequired: false,
    isRecommended: true,
    dashboardWidgets: ['stock', 'alerts'],
    navigationItems: ['/stock', '/warehouses', '/items'],
    features: ['Warehouse management', 'Stock tracking', 'Low stock alerts', 'Movement history'],
  },
  sales: {
    id: 'sales',
    name: 'Sales',
    nameKey: 'modules.sales.name',
    description: 'Quotes, orders and invoices',
    descriptionKey: 'modules.sales.description',
    icon: ShoppingCart,
    color: 'purple',
    category: 'finance',
    priceMonthly: 10,
    isRequired: false,
    isRecommended: false,
    dashboardWidgets: ['sales'],
    navigationItems: ['/customers', '/quotes', '/sales-orders', '/invoices'],
    features: ['Customer management', 'Quote creation', 'Order processing', 'Invoice generation'],
  },
  procurement: {
    id: 'procurement',
    name: 'Procurement',
    nameKey: 'modules.procurement.name',
    description: 'Suppliers and purchase orders',
    descriptionKey: 'modules.procurement.description',
    icon: Truck,
    color: 'orange',
    category: 'operations',
    priceMonthly: 8,
    isRequired: false,
    isRecommended: false,
    dashboardWidgets: [],
    navigationItems: ['/suppliers', '/purchase-orders'],
    features: ['Supplier management', 'Purchase orders', 'Delivery tracking'],
  },
  accounting: {
    id: 'accounting',
    name: 'Accounting',
    nameKey: 'modules.accounting.name',
    description: 'Chart of accounts and journals',
    descriptionKey: 'modules.accounting.description',
    icon: Receipt,
    color: 'indigo',
    category: 'finance',
    priceMonthly: 12,
    isRequired: false,
    isRecommended: false,
    dashboardWidgets: ['financial', 'accounting'],
    navigationItems: ['/accounts', '/journal-entries', '/financial-reports'],
    features: ['Chart of accounts', 'Journal entries', 'Financial reports', 'Bank reconciliation'],
  },
  hr: {
    id: 'hr',
    name: 'Human Resources',
    nameKey: 'modules.hr.name',
    description: 'Employees, attendance and payroll',
    descriptionKey: 'modules.hr.description',
    icon: Users,
    color: 'pink',
    category: 'operations',
    priceMonthly: 10,
    isRequired: false,
    isRecommended: true,
    dashboardWidgets: ['workers'],
    navigationItems: ['/workers', '/piece-work', '/work-units'],
    features: ['Employee management', 'Attendance tracking', 'Payroll', 'Work assignments'],
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics & Satellite',
    nameKey: 'modules.analytics.name',
    description: 'NDVI, crop health and predictions',
    descriptionKey: 'modules.analytics.description',
    icon: Satellite,
    color: 'cyan',
    category: 'analytics',
    priceMonthly: 20,
    isRequired: false,
    isRecommended: false,
    dashboardWidgets: ['soil', 'production'],
    navigationItems: ['/satellite-indices', '/soil-analyses', '/reports'],
    features: ['Satellite imagery', 'NDVI analysis', 'Crop health monitoring', 'Predictive analytics'],
  },
  marketplace: {
    id: 'marketplace',
    name: 'Marketplace',
    nameKey: 'modules.marketplace.name',
    description: 'Sell your products online',
    descriptionKey: 'modules.marketplace.description',
    icon: Building,
    color: 'green',
    category: 'marketplace',
    priceMonthly: 15,
    isRequired: false,
    isRecommended: false,
    dashboardWidgets: [],
    navigationItems: ['/marketplace'],
    features: ['Product listings', 'Online store', 'Order management', 'Payment processing'],
  },
};

export const WIDGET_TO_MODULE_MAP: Record<string, string> = {
  parcels: 'farm_management',
  farm: 'farm_management',
  tasks: 'farm_management',
  harvests: 'farm_management',
  stock: 'inventory',
  alerts: 'inventory',
  sales: 'sales',
  financial: 'accounting',
  accounting: 'accounting',
  workers: 'hr',
  soil: 'analytics',
  production: 'analytics',
};

export function getModuleById(moduleId: string): ModuleConfig | undefined {
  return MODULE_CONFIGS[moduleId];
}

export function getModulesByCategory(category: ModuleConfig['category']): ModuleConfig[] {
  return Object.values(MODULE_CONFIGS).filter(m => m.category === category);
}

export function getRequiredModules(): ModuleConfig[] {
  return Object.values(MODULE_CONFIGS).filter(m => m.isRequired);
}

export function getRecommendedModules(): ModuleConfig[] {
  return Object.values(MODULE_CONFIGS).filter(m => m.isRecommended);
}

export function calculateSubscriptionPrice(selectedModuleIds: string[]): {
  basePrice: number;
  modulesPrice: number;
  totalPrice: number;
  breakdown: { moduleId: string; name: string; price: number }[];
} {
  const breakdown: { moduleId: string; name: string; price: number }[] = [];
  let modulesPrice = 0;

  for (const moduleId of selectedModuleIds) {
    const module = MODULE_CONFIGS[moduleId];
    if (module && !module.isRequired) {
      breakdown.push({
        moduleId: module.id,
        name: module.name,
        price: module.priceMonthly,
      });
      modulesPrice += module.priceMonthly;
    }
  }

  return {
    basePrice: BASE_SUBSCRIPTION_PRICE,
    modulesPrice,
    totalPrice: BASE_SUBSCRIPTION_PRICE + modulesPrice,
    breakdown,
  };
}

export function getWidgetsForModules(activeModuleIds: string[]): string[] {
  const widgets: Set<string> = new Set();

  for (const moduleId of activeModuleIds) {
    const module = MODULE_CONFIGS[moduleId];
    if (module) {
      for (const widget of module.dashboardWidgets) {
        widgets.add(widget);
      }
    }
  }

  return Array.from(widgets);
}

export function getNavigationForModules(activeModuleIds: string[]): string[] {
  const navItems: Set<string> = new Set();

  for (const moduleId of activeModuleIds) {
    const module = MODULE_CONFIGS[moduleId];
    if (module) {
      for (const nav of module.navigationItems) {
        navItems.add(nav);
      }
    }
  }

  return Array.from(navItems);
}

export function isWidgetAvailable(widgetId: string, activeModuleIds: string[]): boolean {
  const requiredModule = WIDGET_TO_MODULE_MAP[widgetId];
  if (!requiredModule) return true;
  return activeModuleIds.includes(requiredModule);
}

export function isNavigationAvailable(path: string, activeModuleIds: string[]): boolean {
  for (const moduleId of activeModuleIds) {
    const module = MODULE_CONFIGS[moduleId];
    if (module && module.navigationItems.some(nav => path.startsWith(nav))) {
      return true;
    }
  }
  return false;
}

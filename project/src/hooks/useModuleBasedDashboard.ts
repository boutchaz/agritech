import { useMemo, useCallback } from 'react';
import { useModules } from './useModules';
import { useModuleConfig, useWidgetToModuleMap } from './useModuleConfig';
import type { DashboardSettings } from '../types';

export interface ModuleBasedDashboardConfig {
  activeModules: string[];
  availableWidgets: string[];
  availableNavigation: string[];
  availableNavigationSet: Set<string>;
  isWidgetEnabled: (widgetId: string) => boolean;
  isNavigationEnabled: (path: string) => boolean;
  isLoading: boolean;
}

// Mapping from old module names to new module slugs
const LEGACY_MODULE_MAPPING: Record<string, string> = {
  'dashboard': 'dashboard',
  'farms': 'farm_management',
  'parcels': 'farm_management',
  'harvests': 'farm_management',
  'tasks': 'farm_management',
  'workers': 'hr',
  'stock': 'inventory',
  'items': 'inventory',
  'warehouses': 'inventory',
  'customers': 'sales',
  'quotes': 'sales',
  'sales_orders': 'sales',
  'invoices': 'accounting',
  'payments': 'accounting',
  'accounts': 'accounting',
  'journal': 'accounting',
  'utilities': 'accounting',
  'reports': 'analytics',
  'satellite': 'analytics',
  'soil': 'analytics',
  'suppliers': 'procurement',
  'purchase_orders': 'procurement',
  'marketplace': 'marketplace',
  'chat': 'analytics',
  'compliance': 'compliance',
  'certifications': 'compliance',
  'settings': 'core',
};

export function useModuleBasedDashboard(): ModuleBasedDashboardConfig {
  const { data: orgModules = [], isLoading: orgModulesLoading } = useModules();
  const { data: config, isLoading: configLoading } = useModuleConfig();
  const { data: widgetToModuleMap } = useWidgetToModuleMap();

  const isLoading = orgModulesLoading || configLoading;

  const activeModuleSlugs = useMemo(() => {
    if (!config) return [];

    const active = orgModules
      .filter(m => m.is_active)
      .map(m => {
        // First try direct name/slug matching
        let moduleConfig = config.modules.find(cfg =>
          cfg.name.toLowerCase() === m.name.toLowerCase() ||
          cfg.slug === m.name.toLowerCase().replace(/\s+/g, '_') ||
          m.name.toLowerCase().includes(cfg.slug.replace('_', ''))
        );

        // If no match found, try the legacy mapping
        if (!moduleConfig) {
          const legacySlug = LEGACY_MODULE_MAPPING[m.name.toLowerCase()];
          if (legacySlug) {
            moduleConfig = config.modules.find(cfg => cfg.slug === legacySlug);
          }
        }

        const slug = moduleConfig?.slug || LEGACY_MODULE_MAPPING[m.name.toLowerCase()] || m.name.toLowerCase().replace(/\s+/g, '_');
        return slug;
      });

    return active;
  }, [orgModules, config]);

  const availableWidgets = useMemo(() => {
    if (!config) return [];

    const widgets = new Set<string>();

    for (const slug of activeModuleSlugs) {
      const moduleConfig = config.modules.find(m => m.slug === slug);
      if (moduleConfig) {
        for (const widget of moduleConfig.dashboardWidgets) {
          widgets.add(widget);
        }
      }
    }

    Object.entries(widgetToModuleMap).forEach(([widgetId, requiredModule]) => {
      if (activeModuleSlugs.includes(requiredModule)) {
        widgets.add(widgetId);
      }
    });

    return Array.from(widgets);
  }, [activeModuleSlugs, config, widgetToModuleMap]);

  const availableNavigationSet = useMemo(() => {
    if (!config) return new Set<string>();

    const navItems = new Set<string>();

    for (const slug of activeModuleSlugs) {
      const moduleConfig = config.modules.find(m => m.slug === slug);
      if (moduleConfig) {
        for (const nav of moduleConfig.navigationItems) {
          navItems.add(nav);
        }
      }
    }

    return navItems;
  }, [activeModuleSlugs, config]);

  const availableNavigation = useMemo(() => {
    return Array.from(availableNavigationSet);
  }, [availableNavigationSet]);

  const isWidgetEnabled = useCallback((widgetId: string): boolean => {
    const requiredModule = widgetToModuleMap?.[widgetId];
    if (!requiredModule) return true;
    return activeModuleSlugs.includes(requiredModule);
  }, [widgetToModuleMap, activeModuleSlugs]);

  const isNavigationEnabled = useCallback((path: string): boolean => {
    // Check if path starts with any available navigation path
    for (const nav of availableNavigationSet) {
      if (path.startsWith(nav)) {
        return true;
      }
    }
    return false;
  }, [availableNavigationSet]);

  return {
    activeModules: activeModuleSlugs,
    availableWidgets,
    availableNavigation,
    availableNavigationSet,
    isWidgetEnabled,
    isNavigationEnabled,
    isLoading,
  };
}

export function convertToModuleBasedSettings(
  activeModuleIds: string[],
  existingSettings?: Partial<DashboardSettings>
): DashboardSettings {
  const hasInventory = activeModuleIds.includes('inventory');
  const hasFarmManagement = activeModuleIds.includes('farm_management');
  const hasAnalytics = activeModuleIds.includes('analytics');
  const hasAccounting = activeModuleIds.includes('accounting');

  return {
    showSoilData: hasAnalytics,
    showClimateData: hasAnalytics,
    showIrrigationData: hasFarmManagement,
    showMaintenanceData: hasFarmManagement,
    showProductionData: hasFarmManagement || hasAnalytics,
    showFinancialData: hasAccounting,
    showStockAlerts: hasInventory,
    showTaskAlerts: hasFarmManagement,
    layout: existingSettings?.layout || {
      topRow: [],
      middleRow: [],
      bottomRow: [],
    },
  };
}

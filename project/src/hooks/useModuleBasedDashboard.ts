import { useMemo, useCallback } from 'react';
import { useModules } from './useModules';
import { useModuleConfig, useWidgetToModuleMap } from './useModuleConfig';
import { findOwningModuleSlug, isPathEnabled, type ModuleNavInfo } from '../lib/module-gating';
import type { DashboardSettings } from '../types';

export interface ModuleBasedDashboardConfig {
  activeModules: string[];
  availableWidgets: string[];
  availableNavigation: string[];
  availableNavigationSet: Set<string>;
  isWidgetEnabled: (widgetId: string) => boolean;
  isNavigationEnabled: (path: string) => boolean;
  findOwningModule: (path: string) => string | null;
  isLoading: boolean;
}

export function useModuleBasedDashboard(): ModuleBasedDashboardConfig {
  const { data: orgModules = [], isLoading: orgModulesLoading } = useModules();
  const { data: config, isLoading: configLoading } = useModuleConfig();
  const { data: widgetToModuleMap } = useWidgetToModuleMap();

  const isLoading = orgModulesLoading || configLoading;

  // Active module slugs: anything active in organization_modules, plus every
  // is_required module from the catalog (defense in depth — the DB trigger
  // should already have inserted a row, but fail-safe).
  const activeModuleSlugs = useMemo(() => {
    const active = new Set<string>();
    for (const m of orgModules) {
      if (m.is_active && m.slug) active.add(m.slug);
    }
    if (config) {
      for (const m of config.modules) {
        if (m.isRequired) active.add(m.slug);
      }
    }
    return Array.from(active);
  }, [orgModules, config]);

  const activeSlugSet = useMemo(() => new Set(activeModuleSlugs), [activeModuleSlugs]);

  // Full catalog view for gating (active + inactive) — needed so that
  // isNavigationEnabled can detect when a path is owned by an inactive
  // module and correctly block it.
  const catalogNavInfo: ModuleNavInfo[] = useMemo(() => {
    if (!config) return [];
    return config.modules.map((m) => ({
      slug: m.slug,
      navigationItems: m.navigationItems || [],
    }));
  }, [config]);

  const availableWidgets = useMemo(() => {
    if (!config) return [];

    const widgets = new Set<string>();

    for (const slug of activeModuleSlugs) {
      const moduleConfig = config.modules.find((m) => m.slug === slug);
      if (moduleConfig) {
        for (const widget of moduleConfig.dashboardWidgets) {
          widgets.add(widget);
        }
      }
    }

    Object.entries(widgetToModuleMap || {}).forEach(([widgetId, requiredModule]) => {
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
      const moduleConfig = config.modules.find((m) => m.slug === slug);
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

  const isWidgetEnabled = useCallback(
    (widgetId: string): boolean => {
      const requiredModule = widgetToModuleMap?.[widgetId];
      if (!requiredModule) return true;
      return activeModuleSlugs.includes(requiredModule);
    },
    [widgetToModuleMap, activeModuleSlugs],
  );

  const isNavigationEnabled = useCallback(
    (path: string): boolean => {
      return isPathEnabled(path, catalogNavInfo, activeSlugSet);
    },
    [catalogNavInfo, activeSlugSet],
  );

  const findOwningModule = useCallback(
    (path: string): string | null => {
      return findOwningModuleSlug(path, catalogNavInfo);
    },
    [catalogNavInfo],
  );

  return {
    activeModules: activeModuleSlugs,
    availableWidgets,
    availableNavigation,
    availableNavigationSet,
    isWidgetEnabled,
    isNavigationEnabled,
    findOwningModule,
    isLoading,
  };
}

export function convertToModuleBasedSettings(
  activeModuleIds: string[],
  existingSettings?: Partial<DashboardSettings>,
): DashboardSettings {
  const hasInventory = activeModuleIds.includes('stock');
  const hasProduction = activeModuleIds.includes('production');
  const hasFruitTrees = activeModuleIds.includes('fruit_trees');
  const hasAnalytics =
    activeModuleIds.includes('satellite') ||
    activeModuleIds.includes('agromind_advisor');
  const hasAccounting = activeModuleIds.includes('accounting');
  const hasPersonnel = activeModuleIds.includes('personnel');

  return {
    showSoilData: hasAnalytics,
    showClimateData: hasAnalytics,
    showIrrigationData: hasProduction,
    showMaintenanceData: hasFruitTrees || hasProduction,
    showProductionData: hasProduction || hasAnalytics,
    showFinancialData: hasAccounting,
    showStockAlerts: hasInventory,
    showTaskAlerts: hasPersonnel,
    layout: existingSettings?.layout || {
      topRow: [],
      middleRow: [],
      bottomRow: [],
    },
  };
}

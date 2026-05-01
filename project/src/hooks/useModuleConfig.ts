import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { moduleConfigApi, type ModuleConfig, type ModuleConfigResponse } from '@/lib/api/module-config';
import { useAuth } from './useAuth';

export const MODULE_CONFIG_QUERY_KEY = ['moduleConfig'];

/**
 * Returns the module catalog. When an organization is selected, the response
 * is enriched with per-module `isActive` and `settings` from that org's
 * activation state — no separate /modules call needed.
 */
export function useModuleConfig() {
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  return useQuery<ModuleConfigResponse>({
    queryKey: [...MODULE_CONFIG_QUERY_KEY, locale, orgId ?? 'public'],
    queryFn: () =>
      orgId
        ? moduleConfigApi.getOrgConfig(orgId, locale)
        : moduleConfigApi.getConfig(locale),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function useModuleById(slug: string) {
  const { data, ...rest } = useModuleConfig();
  const module = data?.modules.find((m) => m.slug === slug);
  return { data: module, ...rest };
}

export function useModulesByCategory(category: string) {
  const { data, ...rest } = useModuleConfig();
  const modules = data?.modules.filter((m) => m.category === category) || [];
  return { data: modules, ...rest };
}

export function useRequiredModules() {
  const { data, ...rest } = useModuleConfig();
  const modules = data?.modules.filter((m) => m.isRequired) || [];
  return { data: modules, ...rest };
}

export function useRecommendedModules() {
  const { data, ...rest } = useModuleConfig();
  const modules = data?.modules.filter((m) => m.isRecommended) || [];
  return { data: modules, ...rest };
}

export function useSubscriptionPricing() {
  const { data, ...rest } = useModuleConfig();
  return { data: data?.pricing, ...rest };
}

export function useWidgetToModuleMap() {
  const { data, ...rest } = useModuleConfig();
  return { data: data?.widgetToModuleMap || {}, ...rest };
}

export function useCalculatePrice(selectedModuleSlugs: string[]) {
  const { data: config } = useModuleConfig();

  if (!config) {
    return { basePrice: 0, modulesPrice: 0, totalPrice: 0, breakdown: [] };
  }

  const breakdown: { slug: string; name: string; price: number }[] = [];
  let modulesPrice = 0;

  for (const slug of selectedModuleSlugs) {
    const module = config.modules.find((m) => m.slug === slug);
    if (module && !module.isRequired && module.priceMonthly > 0) {
      breakdown.push({
        slug: module.slug,
        name: module.name,
        price: module.priceMonthly,
      });
      modulesPrice += module.priceMonthly;
    }
  }

  return {
    basePrice: config.pricing.basePriceMonthly,
    modulesPrice,
    totalPrice: config.pricing.basePriceMonthly + modulesPrice,
    breakdown,
  };
}

export function useIsWidgetAvailable(widgetId: string, activeModuleSlugs: string[]) {
  const { data: widgetMap } = useWidgetToModuleMap();
  
  const requiredModule = widgetMap[widgetId];
  if (!requiredModule) return true;
  return activeModuleSlugs.includes(requiredModule);
}

export function useAvailableWidgets(activeModuleSlugs: string[]) {
  const { data: config } = useModuleConfig();
  
  if (!config) return [];

  const widgets = new Set<string>();
  for (const slug of activeModuleSlugs) {
    const module = config.modules.find((m) => m.slug === slug);
    if (module) {
      for (const widget of module.dashboardWidgets) {
        widgets.add(widget);
      }
    }
  }
  return Array.from(widgets);
}

export function useAvailableNavigation(activeModuleSlugs: string[]) {
  const { data: config } = useModuleConfig();
  
  if (!config) return [];

  const navItems = new Set<string>();
  for (const slug of activeModuleSlugs) {
    const module = config.modules.find((m) => m.slug === slug);
    if (module) {
      for (const nav of module.navigationItems) {
        navItems.add(nav);
      }
    }
  }
  return Array.from(navItems);
}

export type { ModuleConfig, ModuleConfigResponse };

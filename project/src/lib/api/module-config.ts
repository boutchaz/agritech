import { apiClient } from '../api-client';

export interface ModuleConfig {
  id: string;
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
  requiredPlan?: string | null;
  dashboardWidgets: string[];
  navigationItems: string[];
  name: string;
  description: string;
  features: string[];
}

export interface SubscriptionPricing {
  basePriceMonthly: number;
  trialDays: number;
  addonSlotPrice: number;
}

export interface ModuleConfigResponse {
  modules: ModuleConfig[];
  pricing: SubscriptionPricing;
  widgetToModuleMap: Record<string, string>;
}

export interface CalculatePriceResponse {
  basePrice: number;
  modulesPrice: number;
  totalPrice: number;
  breakdown: { slug: string; name: string; price: number }[];
}

const BASE_URL = '/api/v1/module-config';

export const moduleConfigApi = {
  async getConfig(locale?: string): Promise<ModuleConfigResponse> {
    const params = locale ? `?locale=${locale}` : '';
    return apiClient.get<ModuleConfigResponse>(`${BASE_URL}${params}`);
  },

  async calculatePrice(moduleSlugs: string[]): Promise<CalculatePriceResponse> {
    return apiClient.post<CalculatePriceResponse>(`${BASE_URL}/calculate-price`, {
      moduleSlugs,
    });
  },

  async clearCache(): Promise<void> {
    return apiClient.post(`${BASE_URL}/clear-cache`, {});
  },
};

export function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    MapPin: 'MapPin',
    Package: 'Package',
    ShoppingCart: 'ShoppingCart',
    Truck: 'Truck',
    Receipt: 'Receipt',
    Users: 'Users',
    Satellite: 'Satellite',
    Building: 'Building',
  };
  return iconMap[iconName] || 'Package';
}

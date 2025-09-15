export interface Module {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  category: 'agriculture' | 'elevage';
  description: string;
  metrics: {
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface SensorData {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  location: string;
}

export interface DashboardSettings {
  showSoilData: boolean;
  showClimateData: boolean;
  showIrrigationData: boolean;
  showMaintenanceData: boolean;
  showProductionData: boolean;
  showFinancialData: boolean;
  showStockAlerts: boolean;
  showTaskAlerts: boolean;
  layout: {
    topRow: string[];
    middleRow: string[];
    bottomRow: string[];
  };
}

// Multi-tenant types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_active: boolean;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  size: number;
  manager_name: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
}
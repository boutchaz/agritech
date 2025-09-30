// Existing types...

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
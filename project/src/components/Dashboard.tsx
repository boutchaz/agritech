import React from 'react';
import { Activity, Droplets, Thermometer, Wrench, AlertTriangle, MapPin } from 'lucide-react';
import type { SensorData, DashboardSettings } from '../types';
import { useSensorData } from '../hooks/useSensorData';
import { useAuth } from './MultiTenantAuthProvider';
import { useParcels } from '../hooks/useParcels';
import { useSoilAnalyses } from '../hooks/useSoilAnalyses';
import { useNavigate } from '@tanstack/react-router';
import UpcomingTasksWidget from './Dashboard/UpcomingTasksWidget';
import ParcelsOverviewWidget from './Dashboard/ParcelsOverviewWidget';
import StockAlertsWidget from './Dashboard/StockAlertsWidget';
import WorkersActivityWidget from './Dashboard/WorkersActivityWidget';
import SoilAnalysisWidget from './Dashboard/SoilAnalysisWidget';
import HarvestSummaryWidget from './Dashboard/HarvestSummaryWidget';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  sensorData: SensorData[];
  settings: DashboardSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ sensorData: _sensorData, settings }) => {
  const { t } = useTranslation();
  const { latestReadings, _isConnected } = useSensorData();
  const { currentFarm } = useAuth();
  const farmId = currentFarm?.id ?? null;
  const { parcels, loading: parcelsLoading } = useParcels(farmId);
  const { analyses, loading: analysesLoading } = useSoilAnalyses(currentFarm?.id ?? '');
  const navigate = useNavigate();

  const getSensorValue = (type: string) => {
    return latestReadings[type]?.value.toFixed(1) || '0';
  };

  const infrastructureStatus = {
    pump: {
      status: 'active',
      lastStarted: new Date().toLocaleTimeString(),
      flowRate: 25.5
    },
    basin: {
      currentLevel: 850,
      capacity: 1000,
      lastUpdated: new Date().toLocaleTimeString()
    },
    irrigation: {
      status: 'active',
      startTime: '08:00',
      duration: 120,
      sector: 'Secteur A'
    },
    maintenance: [
      {
        id: 1,
        type: 'Pompe principale',
        status: 'En cours',
        startDate: '2024-05-15',
        expectedEndDate: '2024-05-16'
      }
    ]
  };

  interface Parcel {
    calculated_area?: number;
    area?: number;
  }

  const totalArea = parcels.reduce((sum, p) => sum + ((p as Parcel).calculated_area ?? (p as Parcel).area ?? 0), 0);

  const renderWidget = (type: string) => {
    switch (type) {
      case 'farm':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.widgets.farm.title')}</p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2 truncate">
                  {currentFarm ? currentFarm.name : t('dashboard.widgets.farm.noFarm')}
                </h3>
              </div>
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
            <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <div className="text-gray-500 text-xs sm:text-sm">{t('dashboard.widgets.farm.parcels')}</div>
                <div className="text-base sm:text-lg font-semibold">{parcelsLoading ? '…' : parcels.length}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs sm:text-sm">{t('dashboard.widgets.farm.surface')}</div>
                <div className="text-base sm:text-lg font-semibold">{parcelsLoading ? '…' : totalArea.toFixed(2)} ha</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs sm:text-sm">{t('dashboard.widgets.farm.analyses')}</div>
                <div className="text-base sm:text-lg font-semibold">{analysesLoading ? '…' : analyses.length}</div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => navigate({ to: '/parcels' })}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 w-full sm:w-auto"
              >
                {t('dashboard.widgets.farm.viewParcels')}
              </button>
              <button
                onClick={() => navigate({ to: '/parcels' })}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                {t('dashboard.widgets.farm.addParcel')}
              </button>
            </div>
          </div>
        );
      case 'soil':
        return settings.showSoilData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.widgets.soil.ph')}</p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {getSensorValue('ph')}
                </h3>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <div
                  className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(Number(getSensorValue('ph')) / 14) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      case 'climate':
        return settings.showClimateData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.widgets.climate.temperature')}</p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {getSensorValue('temperature')}°C
                </h3>
              </div>
              <Thermometer className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="h-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <div
                  className="h-2 bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${(Number(getSensorValue('temperature')) / 50) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      case 'irrigation':
        return settings.showIrrigationData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.widgets.irrigation.title')}</p>
                <div className="flex items-center space-x-2 mt-1 sm:mt-2">
                  <h3 className={`text-base sm:text-lg font-bold ${
                    infrastructureStatus.irrigation.status === 'active'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {infrastructureStatus.irrigation.status === 'active' ? t('dashboard.widgets.irrigation.active') : t('dashboard.widgets.irrigation.stopped')}
                  </h3>
                  <Droplets className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    infrastructureStatus.irrigation.status === 'active'
                      ? 'text-green-500'
                      : 'text-gray-500'
                  }`} />
                </div>
              </div>
            </div>
            {infrastructureStatus.irrigation.status === 'active' && (
              <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('dashboard.widgets.irrigation.sector')}</span>
                  <span className="font-medium">{infrastructureStatus.irrigation.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('dashboard.widgets.irrigation.start')}</span>
                  <span className="font-medium">{infrastructureStatus.irrigation.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('dashboard.widgets.irrigation.duration')}</span>
                  <span className="font-medium">{infrastructureStatus.irrigation.duration} min</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'maintenance':
        return settings.showMaintenanceData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.widgets.maintenance.title')}</p>
                <div className="flex items-center space-x-2 mt-1 sm:mt-2">
                  <h3 className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">
                    {infrastructureStatus.maintenance.length} {t('dashboard.widgets.maintenance.inProgress')}
                  </h3>
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {infrastructureStatus.maintenance.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">
                      {item.type}
                    </span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-orange-600 dark:text-orange-400 space-y-0.5">
                    <p>{t('dashboard.widgets.maintenance.start')}: {new Date(item.startDate).toLocaleDateString()}</p>
                    <p>{t('dashboard.widgets.maintenance.expectedEnd')}: {new Date(item.expectedEndDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'production':
        return settings.showProductionData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t('dashboard.widgets.production.title')}
            </h3>
            <div className="h-48 sm:h-56 lg:h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-500">{t('dashboard.widgets.production.chartComing')}</span>
            </div>
          </div>
        );

      case 'financial':
        return settings.showFinancialData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t('dashboard.widgets.financial.title')}
            </h3>
            <div className="h-48 sm:h-56 lg:h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-500">{t('dashboard.widgets.financial.chartComing')}</span>
            </div>
          </div>
        );

      case 'alerts':
        return settings.showStockAlerts && (
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t('dashboard.widgets.alerts.title')}
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                    {t('dashboard.widgets.alerts.lowStock')}: Fertilisant NPK
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      // The following widgets are hardcoded in the render section and should not be in the switch
      // case 'tasks': handled by hardcoded UpcomingTasksWidget
      // case 'parcels': handled by hardcoded ParcelsOverviewWidget
      // case 'stock': handled by hardcoded StockAlertsWidget
      // case 'workers': handled by hardcoded WorkersActivityWidget
      // case 'soil': handled by hardcoded SoilAnalysisWidget (also has duplicate case above)
      // case 'harvests': handled by hardcoded HarvestSummaryWidget

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {!currentFarm && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          {t('dashboard.widgets.noFarmSelected')}
        </div>
      )}

      {/* Main Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ParcelsOverviewWidget />
        <WorkersActivityWidget />
        {settings.showStockAlerts && <StockAlertsWidget />}
        <HarvestSummaryWidget />
      </div>

      {/* Tasks and Soil Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.showTaskAlerts && <UpcomingTasksWidget />}
        {settings.showSoilData && <SoilAnalysisWidget />}
      </div>

      {/* Additional Widgets from Settings */}
      {settings.layout?.middleRow && settings.layout.middleRow.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settings.layout.middleRow
            .filter(w => !['tasks', 'soil'].includes(w))
            .map((widgetType, index) => (
              <div key={`middle-${widgetType}-${index}`}>
                {renderWidget(widgetType)}
              </div>
            ))}
        </div>
      )}

      {settings.layout?.bottomRow && settings.layout.bottomRow.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settings.layout.bottomRow.map((widgetType, index) => (
            <div key={`bottom-${widgetType}-${index}`}>
              {renderWidget(widgetType)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

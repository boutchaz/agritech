import React from 'react';
import { Activity, AlertTriangle, MapPin } from 'lucide-react';
import type { SensorData, DashboardSettings } from '../types';
import { useSensorData } from '../hooks/useSensorData';
import { useAuth } from '../hooks/useAuth';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useNavigate } from '@tanstack/react-router';
import UpcomingTasksWidget from './Dashboard/UpcomingTasksWidget';
import ParcelsOverviewWidget from './Dashboard/ParcelsOverviewWidget';
import StockAlertsWidget from './Dashboard/StockAlertsWidget';
import WorkersActivityWidget from './Dashboard/WorkersActivityWidget';
import AnalysisWidget from './Dashboard/AnalysisWidget';
import HarvestSummaryWidget from './Dashboard/HarvestSummaryWidget';
import SalesOverviewWidget from './Dashboard/SalesOverviewWidget';
import AccountingWidget from './Dashboard/AccountingWidget';
import InlineFarmSelector from './InlineFarmSelector';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardProps {
  sensorData: SensorData[];
  settings: DashboardSettings;
}

function DisabledWidgetPlaceholder({ title }: { title: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-7 flex items-center justify-center min-h-[320px]">
      <p className="text-sm text-gray-400 dark:text-gray-500">{title}</p>
    </div>
  );
}

const Dashboard: React.FC<DashboardProps> = ({ sensorData: _sensorData, settings }) => {
  const { t } = useTranslation();
  const { latestReadings } = useSensorData();
  const { currentFarm } = useAuth();
  const farmId = currentFarm?.id ?? null;
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary(farmId || undefined);
  const navigate = useNavigate();

  const getSensorValue = (type: string) => {
    return latestReadings[type]?.value.toFixed(1) || '0';
  };


  // Get summary data from dashboard API
  const parcelCount = dashboardData?.parcels.total ?? 0;
  const totalArea = dashboardData?.parcels.totalArea ?? 0;
  // Note: Soil analyses are not currently included in the dashboard summary
  // This could be added to the backend DashboardService if needed
  const analysesCount = 0;

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
                <div className="text-base sm:text-lg font-semibold">{dashboardLoading ? <Skeleton className="h-6 w-10 inline-block" /> : parcelCount}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs sm:text-sm">{t('dashboard.widgets.farm.surface')}</div>
                <div className="text-base sm:text-lg font-semibold">{dashboardLoading ? <Skeleton className="h-6 w-16 inline-block" /> : <>{totalArea.toFixed(2)} ha</>}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs sm:text-sm">{t('dashboard.widgets.farm.analyses')}</div>
                <div className="text-base sm:text-lg font-semibold">{dashboardLoading ? <Skeleton className="h-6 w-10 inline-block" /> : analysesCount}</div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: '/parcels' })}
                className="w-full sm:w-auto"
              >
                {t('dashboard.widgets.farm.viewParcels')}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate({ to: '/parcels' })}
                className="w-full sm:w-auto"
              >
                {t('dashboard.widgets.farm.addParcel')}
              </Button>
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
      // case 'soil': handled by hardcoded AnalysisWidget (also has duplicate case above)
      // case 'harvests': handled by hardcoded HarvestSummaryWidget

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <InlineFarmSelector message={t('dashboard.widgets.noFarmSelected')} />

      {/* Row 1: Key Performance Indicators */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div data-tour="dashboard-parcels"><ParcelsOverviewWidget /></div>
        {settings.showStockAlerts ? <StockAlertsWidget /> : <DisabledWidgetPlaceholder title={t('dashboard.widgets.stock.title')} />}
        <HarvestSummaryWidget />
        <SalesOverviewWidget />
      </div>

      {/* Row 2: Action Items & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.showTaskAlerts ? <div data-tour="dashboard-tasks"><UpcomingTasksWidget /></div> : <DisabledWidgetPlaceholder title={t('dashboard.widgets.tasks.title')} />}
        <AccountingWidget />
      </div>

      {/* Row 3: Operational Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.showSoilData ? <AnalysisWidget /> : <DisabledWidgetPlaceholder title={t('dashboard.widgets.soil.title')} />}
        <WorkersActivityWidget />
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

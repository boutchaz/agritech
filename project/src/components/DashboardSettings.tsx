import React, { useState } from 'react';
import { LayoutGrid, Save, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardSettingsApi } from '../lib/api/dashboard-settings';
import { useAuth } from '../hooks/useAuth';
import type { DashboardSettings as DashboardSettingsType } from '../types';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const defaultSettings: DashboardSettingsType = {
  showSoilData: true,
  showClimateData: true,
  showIrrigationData: true,
  showMaintenanceData: true,
  showProductionData: true,
  showFinancialData: true,
  showStockAlerts: true,
  showTaskAlerts: true,
  layout: {
    topRow: ['soil', 'climate', 'irrigation', 'maintenance'],
    middleRow: ['production', 'financial'],
    bottomRow: ['alerts', 'tasks']
  }
};

/** API may omit or partially return `layout` — never read `.topRow` on undefined */
function normalizeDashboardLayout(raw: unknown): DashboardSettingsType['layout'] {
  const d = defaultSettings.layout;
  if (!raw || typeof raw !== 'object') {
    return { topRow: [...d.topRow], middleRow: [...d.middleRow], bottomRow: [...d.bottomRow] };
  }
  const L = raw as Record<string, unknown>;
  return {
    topRow: Array.isArray(L.topRow) ? L.topRow.map(String) : [...d.topRow],
    middleRow: Array.isArray(L.middleRow) ? L.middleRow.map(String) : [...d.middleRow],
    bottomRow: Array.isArray(L.bottomRow) ? L.bottomRow.map(String) : [...d.bottomRow],
  };
}

const DashboardSettings: React.FC = () => {
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<DashboardSettingsType>(defaultSettings);
  const [success, setSuccess] = useState(false);

  // Fetch dashboard settings
  const { isLoading } = useQuery({
    queryKey: ['dashboard-settings', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user || !currentOrganization) return null;

      const data = await dashboardSettingsApi.getSettings(currentOrganization.id);

      if (data) {
        const fetchedSettings: DashboardSettingsType = {
          showSoilData: data.show_soil_data ?? defaultSettings.showSoilData,
          showClimateData: data.show_climate_data ?? defaultSettings.showClimateData,
          showIrrigationData: data.show_irrigation_data ?? defaultSettings.showIrrigationData,
          showMaintenanceData: data.show_maintenance_data ?? defaultSettings.showMaintenanceData,
          showProductionData: data.show_production_data ?? defaultSettings.showProductionData,
          showFinancialData: data.show_financial_data ?? defaultSettings.showFinancialData,
          showStockAlerts: data.show_stock_alerts ?? defaultSettings.showStockAlerts,
          showTaskAlerts: data.show_task_alerts ?? defaultSettings.showTaskAlerts,
          layout: normalizeDashboardLayout(data.layout),
        };
        setSettings(fetchedSettings);
        return fetchedSettings;
      }

      return defaultSettings;
    },
    enabled: !!user && !!currentOrganization
  });

  // Save dashboard settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settingsToSave: DashboardSettingsType) => {
      if (!user || !currentOrganization) {
        throw new Error(t('dashboard.errors.userOrOrgNotFound'));
      }

      const dbSettings = {
        show_soil_data: settingsToSave.showSoilData,
        show_climate_data: settingsToSave.showClimateData,
        show_irrigation_data: settingsToSave.showIrrigationData,
        show_maintenance_data: settingsToSave.showMaintenanceData,
        show_production_data: settingsToSave.showProductionData,
        show_financial_data: settingsToSave.showFinancialData,
        show_stock_alerts: settingsToSave.showStockAlerts,
        show_task_alerts: settingsToSave.showTaskAlerts,
        layout: settingsToSave.layout
      };

      await dashboardSettingsApi.upsertSettings(currentOrganization.id, dbSettings);

      return settingsToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-settings', user?.id, currentOrganization?.id]
      });
      setSuccess(true);
      toast.success(t('dashboard.save.success'));
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(t('dashboard.save.failed'), {
        description: error instanceof Error ? error.message : t('dashboard.save.failedDescription'),
      });
    },
  });

  const handleSettingChange = (key: keyof DashboardSettingsType, value: boolean) => {
    setSettings({
      ...settings,
      [key]: value,
      layout: normalizeDashboardLayout(settings.layout),
    });
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...settings,
      layout: normalizeDashboardLayout(settings.layout),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const layout = normalizeDashboardLayout(settings.layout);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <LayoutGrid className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {t('dashboard.title')}
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto shrink-0 h-11 sm:h-10 rounded-xl"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saveMutation.isPending ? t('dashboard.saving') : t('dashboard.save')}</span>
        </Button>
      </div>

      {saveMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-xl">
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 dark:text-red-400">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : t('dashboard.save.failed')}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-xl">
          <p className="text-green-600 dark:text-green-400">
            {t('dashboard.save.success')}
          </p>
        </div>
      )}

      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
        {t('dashboard.description')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Data Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('dashboard.sections.dataDisplay')}
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showSoilData}
                onChange={(e) => handleSettingChange('showSoilData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.soil.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.soil.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showClimateData}
                onChange={(e) => handleSettingChange('showClimateData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.climate.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.climate.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showIrrigationData}
                onChange={(e) => handleSettingChange('showIrrigationData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.irrigation.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.irrigation.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showMaintenanceData}
                onChange={(e) => handleSettingChange('showMaintenanceData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.maintenance.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.maintenance.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showProductionData}
                onChange={(e) => handleSettingChange('showProductionData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.production.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.production.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showFinancialData}
                onChange={(e) => handleSettingChange('showFinancialData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.financial.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.financial.description')}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Alerts Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('dashboard.sections.alerts')}
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showStockAlerts}
                onChange={(e) => handleSettingChange('showStockAlerts', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.alerts.stock.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.alerts.stock.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showTaskAlerts}
                onChange={(e) => handleSettingChange('showTaskAlerts', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.alerts.tasks.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.alerts.tasks.description')}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Layout Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          {t('dashboard.sections.layout')}
        </h3>

        <div className="space-y-5 sm:space-y-6">
          <div className="min-w-0">
            <FormField label={t('dashboard.layout.topRow')} htmlFor="topRow" helper={t('dashboard.layout.helper')}>
              <Select
                id="topRow"
                multiple
                value={layout.topRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...layout,
                      topRow: values
                    }
                  });
                }}
                size={4}
                className="w-full min-h-[10rem] sm:min-h-[9rem] text-base"
              >
              <option value="soil">{t('dashboard.layoutOptions.soil')}</option>
              <option value="climate">{t('dashboard.layoutOptions.climate')}</option>
              <option value="irrigation">{t('dashboard.layoutOptions.irrigation')}</option>
              <option value="maintenance">{t('dashboard.layoutOptions.maintenance')}</option>
              </Select>
            </FormField>
          </div>

          <div className="min-w-0">
            <FormField label={t('dashboard.layout.middleRow')} htmlFor="middleRow">
              <Select
                id="middleRow"
                multiple
                value={layout.middleRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...layout,
                      middleRow: values
                    }
                  });
                }}
                size={3}
                className="w-full min-h-[8rem] sm:min-h-[7rem] text-base"
              >
              <option value="production">{t('dashboard.layoutOptions.production')}</option>
              <option value="financial">{t('dashboard.layoutOptions.financial')}</option>
              <option value="stock">{t('dashboard.layoutOptions.stock')}</option>
              </Select>
            </FormField>
          </div>

          <div className="min-w-0">
            <FormField label={t('dashboard.layout.bottomRow')} htmlFor="bottomRow">
              <Select
                id="bottomRow"
                multiple
                value={layout.bottomRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...layout,
                      bottomRow: values
                    }
                  });
                }}
                size={3}
                className="w-full min-h-[8rem] sm:min-h-[7rem] text-base"
              >
              <option value="alerts">{t('dashboard.layoutOptions.alerts')}</option>
              <option value="tasks">{t('dashboard.layoutOptions.tasks')}</option>
              <option value="weather">{t('dashboard.layoutOptions.weather')}</option>
              </Select>
            </FormField>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          {t('dashboard.preview.title')}
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {layout.topRow.map((item, index) => (
              <div key={index} className="min-h-9 sm:h-8 px-1 bg-green-100 dark:bg-green-900 rounded-lg text-[10px] sm:text-xs font-medium flex items-center justify-center text-center text-green-800 dark:text-green-200">
                {t(`dashboard.layoutOptions.${item}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {layout.middleRow.map((item, index) => (
              <div key={index} className="min-h-9 sm:h-8 px-1 bg-blue-100 dark:bg-blue-900 rounded-lg text-[10px] sm:text-xs font-medium flex items-center justify-center text-center text-blue-800 dark:text-blue-200">
                {t(`dashboard.layoutOptions.${item}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {layout.bottomRow.map((item, index) => (
              <div key={index} className="min-h-9 sm:h-8 px-1 bg-purple-100 dark:bg-purple-900 rounded-lg text-[10px] sm:text-xs font-medium flex items-center justify-center text-center text-purple-800 dark:text-purple-200">
                {t(`dashboard.layoutOptions.${item}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;

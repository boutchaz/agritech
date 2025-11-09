import React, { useState } from 'react';
import { LayoutGrid, Save, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { DashboardSettings as DashboardSettingsType } from '../types';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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

      const { data, error } = await supabase
        .from('dashboard_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const fetchedSettings = {
          showSoilData: data.show_soil_data,
          showClimateData: data.show_climate_data,
          showIrrigationData: data.show_irrigation_data,
          showMaintenanceData: data.show_maintenance_data,
          showProductionData: data.show_production_data,
          showFinancialData: data.show_financial_data,
          showStockAlerts: data.show_stock_alerts,
          showTaskAlerts: data.show_task_alerts,
          layout: data.layout
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
        user_id: user.id,
        organization_id: currentOrganization.id,
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

      const { error } = await supabase
        .from('dashboard_settings')
        .upsert(dbSettings, {
          onConflict: 'user_id,organization_id'
        });

      if (error) throw error;

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
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LayoutGrid className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saveMutation.isPending ? t('dashboard.saving') : t('dashboard.save')}</span>
        </button>
      </div>

      {saveMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
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
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-green-600 dark:text-green-400">
            {t('dashboard.save.success')}
          </p>
        </div>
      )}

      <p className="text-gray-600 dark:text-gray-400">
        {t('dashboard.description')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('dashboard.sections.dataDisplay')}
          </h3>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showSoilData}
                onChange={(e) => handleSettingChange('showSoilData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.soil.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.soil.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showClimateData}
                onChange={(e) => handleSettingChange('showClimateData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.climate.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.climate.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showIrrigationData}
                onChange={(e) => handleSettingChange('showIrrigationData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.irrigation.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.irrigation.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showMaintenanceData}
                onChange={(e) => handleSettingChange('showMaintenanceData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.maintenance.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.maintenance.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showProductionData}
                onChange={(e) => handleSettingChange('showProductionData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.production.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.production.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showFinancialData}
                onChange={(e) => handleSettingChange('showFinancialData', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.financial.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.financial.description')}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Alerts Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('dashboard.sections.alerts')}
          </h3>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showStockAlerts}
                onChange={(e) => handleSettingChange('showStockAlerts', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.alerts.stock.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.alerts.stock.description')}</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.showTaskAlerts}
                onChange={(e) => handleSettingChange('showTaskAlerts', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {t('dashboard.sections.layout')}
        </h3>

        <div className="space-y-6">
          <div>
            <FormField label={t('dashboard.layout.topRow')} htmlFor="topRow" helper={t('dashboard.layout.helper')}>
              <Select
                id="topRow"
                multiple
                value={settings.layout.topRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...settings.layout,
                      topRow: values
                    }
                  });
                }}
                size={4}
              >
              <option value="soil">{t('dashboard.layoutOptions.soil')}</option>
              <option value="climate">{t('dashboard.layoutOptions.climate')}</option>
              <option value="irrigation">{t('dashboard.layoutOptions.irrigation')}</option>
              <option value="maintenance">{t('dashboard.layoutOptions.maintenance')}</option>
              </Select>
            </FormField>
          </div>

          <div>
            <FormField label={t('dashboard.layout.middleRow')} htmlFor="middleRow">
              <Select
                id="middleRow"
                multiple
                value={settings.layout.middleRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...settings.layout,
                      middleRow: values
                    }
                  });
                }}
                size={3}
              >
              <option value="production">{t('dashboard.layoutOptions.production')}</option>
              <option value="financial">{t('dashboard.layoutOptions.financial')}</option>
              <option value="stock">{t('dashboard.layoutOptions.stock')}</option>
              </Select>
            </FormField>
          </div>

          <div>
            <FormField label={t('dashboard.layout.bottomRow')} htmlFor="bottomRow">
              <Select
                id="bottomRow"
                multiple
                value={settings.layout.bottomRow}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSettings({
                    ...settings,
                    layout: {
                      ...settings.layout,
                      bottomRow: values
                    }
                  });
                }}
                size={3}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.preview.title')}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {settings.layout.topRow.map((item, index) => (
              <div key={index} className="h-8 bg-green-100 dark:bg-green-900 rounded text-xs flex items-center justify-center text-green-800 dark:text-green-200">
                {t(`dashboard.layoutOptions.${item}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {settings.layout.middleRow.map((item, index) => (
              <div key={index} className="h-8 bg-blue-100 dark:bg-blue-900 rounded text-xs flex items-center justify-center text-blue-800 dark:text-blue-200">
                {t(`dashboard.layoutOptions.${item}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {settings.layout.bottomRow.map((item, index) => (
              <div key={index} className="h-8 bg-purple-100 dark:bg-purple-900 rounded text-xs flex items-center justify-center text-purple-800 dark:text-purple-200">
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

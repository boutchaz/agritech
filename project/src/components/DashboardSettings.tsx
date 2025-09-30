import React, { useState } from 'react';
import { LayoutGrid, Save, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { DashboardSettings as DashboardSettingsType } from '../types';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';

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
        throw new Error('User or organization not found');
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
      setTimeout(() => setSuccess(false), 3000);
    }
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
            Tableau de bord
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
          <span>{saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>
      </div>

      {saveMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 dark:text-red-400">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : 'Erreur lors de la sauvegarde des paramètres'}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-green-600 dark:text-green-400">
            Paramètres sauvegardés avec succès
          </p>
        </div>
      )}

      <p className="text-gray-600 dark:text-gray-400">
        Personnalisez l'affichage de votre tableau de bord en choisissant les données à afficher et leur disposition.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Données à afficher
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
                <span className="font-medium text-gray-900 dark:text-white">Données du sol</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Humidité, pH, nutriments</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Données climatiques</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Température, humidité, pluviométrie</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Données d'irrigation</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Consommation d'eau, planning</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Données de maintenance</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">État des équipements, interventions</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Données de production</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rendements, récoltes, qualité</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Données financières</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Coûts, revenus, rentabilité</p>
              </div>
            </label>
          </div>
        </div>

        {/* Alerts Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Alertes et notifications
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
                <span className="font-medium text-gray-900 dark:text-white">Alertes de stock</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock faible, ruptures, expirations</p>
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
                <span className="font-medium text-gray-900 dark:text-white">Alertes de tâches</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tâches en retard, échéances</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Layout Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Disposition du tableau de bord
        </h3>

        <div className="space-y-6">
          <div>
            <FormField label="Ligne supérieure" htmlFor="topRow" helper="Maintenez Ctrl/Cmd pour sélectionner plusieurs options">
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
              <option value="soil">Données du sol</option>
              <option value="climate">Données climatiques</option>
              <option value="irrigation">Irrigation</option>
              <option value="maintenance">Maintenance</option>
              </Select>
            </FormField>
          </div>

          <div>
            <FormField label="Ligne centrale" htmlFor="middleRow">
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
              <option value="production">Production</option>
              <option value="financial">Finances</option>
              <option value="stock">Stock</option>
              </Select>
            </FormField>
          </div>

          <div>
            <FormField label="Ligne inférieure" htmlFor="bottomRow">
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
              <option value="alerts">Alertes</option>
              <option value="tasks">Tâches</option>
              <option value="weather">Météo</option>
              </Select>
            </FormField>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Aperçu de la disposition
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {settings.layout.topRow.map((item, index) => (
              <div key={index} className="h-8 bg-green-100 dark:bg-green-900 rounded text-xs flex items-center justify-center text-green-800 dark:text-green-200">
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {settings.layout.middleRow.map((item, index) => (
              <div key={index} className="h-8 bg-blue-100 dark:bg-blue-900 rounded text-xs flex items-center justify-center text-blue-800 dark:text-blue-200">
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {settings.layout.bottomRow.map((item, index) => (
              <div key={index} className="h-8 bg-purple-100 dark:bg-purple-900 rounded text-xs flex items-center justify-center text-purple-800 dark:text-purple-200">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;

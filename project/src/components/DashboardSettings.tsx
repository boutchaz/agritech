import React, { useState } from 'react';
import { LayoutGrid, Save } from 'lucide-react';
import type { DashboardSettings as DashboardSettingsType } from '../types';

interface DashboardSettingsProps {
  dashboardSettings?: DashboardSettingsType;
  onDashboardSettingsChange?: (settings: DashboardSettingsType) => void;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  dashboardSettings = {
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
  },
  onDashboardSettingsChange = () => {}
}) => {
  const [settings, setSettings] = useState(dashboardSettings);

  const handleSettingChange = (key: keyof DashboardSettingsType, value: boolean) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
  };

  const handleSave = () => {
    onDashboardSettingsChange(settings);
    // Add success notification here
  };

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
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          <span>Sauvegarder</span>
        </button>
      </div>

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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ligne supérieure
            </label>
            <select
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              size={4}
            >
              <option value="soil">Données du sol</option>
              <option value="climate">Données climatiques</option>
              <option value="irrigation">Irrigation</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maintenez Ctrl/Cmd pour sélectionner plusieurs options
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ligne centrale
            </label>
            <select
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              size={3}
            >
              <option value="production">Production</option>
              <option value="financial">Finances</option>
              <option value="stock">Stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ligne inférieure
            </label>
            <select
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              size={3}
            >
              <option value="alerts">Alertes</option>
              <option value="tasks">Tâches</option>
              <option value="weather">Météo</option>
            </select>
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
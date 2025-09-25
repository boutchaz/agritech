import React from 'react';
import { Activity, Droplets, Thermometer, Wrench, AlertTriangle, Calendar, MapPin } from 'lucide-react';
import type { SensorData, DashboardSettings } from '../types';
import { useSensorData } from '../hooks/useSensorData';
import { useAuth } from './MultiTenantAuthProvider';
import { useParcels } from '../hooks/useParcels';
import { useSoilAnalyses } from '../hooks/useSoilAnalyses';
import SensorChart from './SensorChart';
import { useNavigate } from '@tanstack/react-router';

interface DashboardProps {
  sensorData: SensorData[];
  settings: DashboardSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ sensorData, settings }) => {
  const { latestReadings, sensorData: sensorDataHook, isConnected } = useSensorData();
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

  const totalArea = parcels.reduce((sum, p: any) => sum + (p.calculated_area ?? p.area ?? 0), 0);

  const renderWidget = (type: string) => {
    switch (type) {
      case 'farm':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ferme</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {currentFarm ? currentFarm.name : 'Aucune ferme sélectionnée'}
                </h3>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Parcelles</div>
                <div className="text-lg font-semibold">{parcelsLoading ? '…' : parcels.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Surface totale</div>
                <div className="text-lg font-semibold">{parcelsLoading ? '…' : totalArea.toFixed(2)} ha</div>
              </div>
              <div>
                <div className="text-gray-500">Analyses de sol</div>
                <div className="text-lg font-semibold">{analysesLoading ? '…' : analyses.length}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate({ to: '/parcels' })}
                className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
              >
                Voir les parcelles
              </button>
              <button
                onClick={() => navigate({ to: '/parcels' })}
                className="px-3 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white"
              >
                Ajouter une parcelle
              </button>
            </div>
          </div>
        );
      case 'soil':
        return settings.showSoilData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">pH du sol</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {getSensorValue('ph')}
                </h3>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <div className="h-2 bg-purple-100 rounded-full">
                <div
                  className="h-2 bg-purple-500 rounded-full"
                  style={{ width: `${(Number(getSensorValue('ph')) / 14) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      case 'climate':
        return settings.showClimateData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Température</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {getSensorValue('temperature')}°C
                </h3>
              </div>
              <Thermometer className="h-8 w-8 text-red-500" />
            </div>
            <div className="mt-4">
              <div className="h-2 bg-red-100 rounded-full">
                <div
                  className="h-2 bg-red-500 rounded-full"
                  style={{ width: `${(Number(getSensorValue('temperature')) / 50) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      case 'irrigation':
        return settings.showIrrigationData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Irrigation</p>
                <div className="flex items-center space-x-2 mt-2">
                  <h3 className={`text-lg font-bold ${
                    infrastructureStatus.irrigation.status === 'active'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {infrastructureStatus.irrigation.status === 'active' ? 'En cours' : 'Arrêtée'}
                  </h3>
                  <Droplets className={`h-5 w-5 ${
                    infrastructureStatus.irrigation.status === 'active'
                      ? 'text-green-500'
                      : 'text-gray-500'
                  }`} />
                </div>
              </div>
            </div>
            {infrastructureStatus.irrigation.status === 'active' && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Secteur</span>
                  <span>{infrastructureStatus.irrigation.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Début</span>
                  <span>{infrastructureStatus.irrigation.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durée</span>
                  <span>{infrastructureStatus.irrigation.duration} min</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'maintenance':
        return settings.showMaintenanceData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintenance</p>
                <div className="flex items-center space-x-2 mt-2">
                  <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {infrastructureStatus.maintenance.length} en cours
                  </h3>
                  <Wrench className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {infrastructureStatus.maintenance.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {item.type}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                    <p>Début: {new Date(item.startDate).toLocaleDateString()}</p>
                    <p>Fin prévue: {new Date(item.expectedEndDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'production':
        return settings.showProductionData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Analyse des rendements
            </h3>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-gray-500">Graphique à venir</span>
            </div>
          </div>
        );

      case 'financial':
        return settings.showFinancialData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Données financières
            </h3>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-gray-500">Graphique à venir</span>
            </div>
          </div>
        );

      case 'alerts':
        return settings.showStockAlerts && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alertes de stock
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Stock faible: Fertilisant NPK
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return settings.showTaskAlerts && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tâches à venir
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <p className="text-blue-700 dark:text-blue-300">
                    Taille des arbres prévue demain
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {!currentFarm && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          Sélectionnez une ferme pour afficher les parcelles et données associées.
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tableau de bord
        </h2>
        <div className={`flex items-center ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          <span className="h-2 w-2 rounded-full bg-current mr-2"></span>
          <span className="text-sm">{isConnected ? 'Connecté' : 'Déconnecté'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {settings.layout.topRow.map((widgetType, index) => (
          <div key={`top-${widgetType}-${index}`}>
            {renderWidget(widgetType)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.layout.middleRow.map((widgetType, index) => (
          <div key={`middle-${widgetType}-${index}`}>
            {renderWidget(widgetType)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.layout.bottomRow.map((widgetType, index) => (
          <div key={`bottom-${widgetType}-${index}`}>
            {renderWidget(widgetType)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

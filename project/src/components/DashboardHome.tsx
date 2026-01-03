import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Activity, Users, Package, Loader2 } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { appConfig } from '@/config/app';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

const DashboardHome: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const { data: summary, isLoading, error } = useDashboardSummary(currentFarm?.id);

  const stats = [
    {
      title: 'Parcelles totales',
      value: summary?.parcels.total ?? 0,
      change: `${summary?.parcels.totalArea?.toFixed(1) ?? 0} ha`,
      trend: 'up',
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Tâches en cours',
      value: summary?.tasks.inProgress ?? 0,
      change: `${summary?.tasks.upcoming ?? 0} à venir`,
      trend: (summary?.tasks.inProgress ?? 0) > 0 ? 'warning' : 'up',
      icon: AlertCircle,
      color: 'yellow'
    },
    {
      title: 'Tâches complétées',
      value: summary?.tasks.completed ?? 0,
      change: `${summary?.tasks.total ?? 0} total`,
      trend: 'up',
      icon: CheckCircle,
      color: 'blue'
    },
    {
      title: 'Travailleurs actifs',
      value: summary?.workers.active ?? 0,
      change: `${summary?.workers.workingToday ?? 0} aujourd'hui`,
      trend: 'up',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Récoltes ce mois',
      value: summary?.harvests.thisMonth ?? 0,
      change: `${summary?.harvests.thisMonthQuantity?.toFixed(0) ?? 0} kg`,
      trend: 'up',
      icon: TrendingUp,
      color: 'emerald'
    },
    {
      title: 'Stock faible',
      value: summary?.inventory.lowStock ?? 0,
      change: `${summary?.inventory.total ?? 0} articles total`,
      trend: (summary?.inventory.lowStock ?? 0) > 0 ? 'warning' : 'up',
      icon: Package,
      color: (summary?.inventory.lowStock ?? 0) > 0 ? 'red' : 'teal'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue sur {appConfig.name}
        </h1>
        <p className="text-green-100">
          {currentOrganization?.name} {currentFarm && `• ${currentFarm.name}`}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des données...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des données du tableau de bord.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </p>
              <p className={`text-sm ${stat.trend === 'up' ? 'text-green-600' :
                stat.trend === 'warning' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 transition-colors">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Nouvelle analyse de sol
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enregistrer une nouvelle analyse
            </p>
          </button>
          <button className="p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 transition-colors">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Ajouter une parcelle
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Créer une nouvelle parcelle
            </p>
          </button>
          <button className="p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 transition-colors">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Générer un rapport
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Créer un rapport personnalisé
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
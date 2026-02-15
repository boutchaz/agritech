import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, AlertCircle, CheckCircle, Activity, Users, Package, Loader2, RefreshCw, Beaker, MapPin, CheckSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { appConfig } from '@/config/app';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

// Color map for dynamic classes (fixes Tailwind JIT issue)
const colorClasses: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  red: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
};

const DashboardHome: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const { data: summary, isLoading, error, refetch } = useDashboardSummary(currentFarm?.id);
  const navigate = useNavigate();

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

  const quickActions = [
    {
      title: 'Nouvelle analyse de sol',
      description: 'Enregistrer une nouvelle analyse',
      icon: Beaker,
      onClick: () => {
        // Navigate to analyses page
        window.location.href = '/analyses';
      },
    },
    {
      title: 'Ajouter une parcelle',
      description: 'Créer une nouvelle parcelle',
      icon: MapPin,
      onClick: () => {
        window.location.href = '/parcels';
      },
    },
    {
      title: 'Nouvelle tâche',
      description: 'Créer une nouvelle tâche',
      icon: CheckSquare,
      onClick: () => {
        window.location.href = '/tasks';
      },
    },
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des données du tableau de bord.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => {
            const colors = colorClasses[stat.color] || colorClasses.green;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colors.bg}`}>
                    <stat.icon className={`w-6 h-6 ${colors.text}`} />
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
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-600 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <action.icon className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {action.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
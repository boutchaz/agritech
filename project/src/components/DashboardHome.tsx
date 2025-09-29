import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';

const DashboardHome: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();

  // Mock data - replace with real data from your backend
  const stats = [
    {
      title: 'Parcelles totales',
      value: '12',
      change: '+2 ce mois',
      trend: 'up',
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Analyses en attente',
      value: '3',
      change: 'Action requise',
      trend: 'warning',
      icon: AlertCircle,
      color: 'yellow'
    },
    {
      title: 'Tâches complétées',
      value: '28',
      change: '+5 cette semaine',
      trend: 'up',
      icon: CheckCircle,
      color: 'blue'
    },
    {
      title: 'Rendement moyen',
      value: '32 t/ha',
      change: '+8% vs année dernière',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue sur AgriTech
        </h1>
        <p className="text-green-100">
          {currentOrganization?.name} {currentFarm && `• ${currentFarm.name}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <p className={`text-sm ${
              stat.trend === 'up' ? 'text-green-600' :
              stat.trend === 'warning' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

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
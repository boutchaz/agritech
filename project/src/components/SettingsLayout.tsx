import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { User, Building, Boxes, Users, Sliders, LayoutGrid, CreditCard } from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'profile',
      name: 'Mon Profil',
      icon: User,
      path: '/settings/profile',
      description: 'Gérer vos informations personnelles'
    },
    {
      id: 'organization',
      name: 'Organisation',
      icon: Building,
      path: '/settings/organization',
      description: 'Paramètres de l\'organisation'
    },
    {
      id: 'subscription',
      name: 'Abonnement',
      icon: CreditCard,
      path: '/settings/subscription',
      description: 'Gérer votre abonnement'
    },
    {
      id: 'modules',
      name: 'Modules',
      icon: Boxes,
      path: '/settings/modules',
      description: 'Activer/désactiver les modules'
    },
    {
      id: 'users',
      name: 'Utilisateurs',
      icon: Users,
      path: '/settings/users',
      description: 'Gérer les utilisateurs'
    },
    {
      id: 'preferences',
      name: 'Préférences',
      icon: Sliders,
      path: '/settings/preferences',
      description: 'Paramètres de l\'application'
    },
    {
      id: 'dashboard',
      name: 'Tableau de bord',
      icon: LayoutGrid,
      path: '/settings/dashboard',
      description: 'Configuration du tableau de bord'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-full">
      {/* Settings Navigation Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos préférences et paramètres
          </p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => navigate({ to: item.path })}
                className={`w-full text-left p-4 rounded-lg transition-colors group ${
                  active
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${
                    active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {item.name}
                    </div>
                    <div className={`text-sm mt-1 ${
                      active ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;
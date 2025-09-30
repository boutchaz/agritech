import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, Trees as Tree, Fish, Leaf, AlertCircle, Settings, Sun, Moon, Sprout, Bird, Bug, Droplets, Flower2, Beef, Sheet as Sheep, Egg, FileText, Map, Package, Building2, Users, UserCog, Wallet, FileSpreadsheet, Network, Satellite } from 'lucide-react';
import type { Module } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from './MultiTenantAuthProvider';

interface SidebarProps {
  modules: Module[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  modules,
  onModuleChange,
  isDarkMode,
  onThemeToggle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { currentOrganization } = useAuth();

  const currentPath = location.pathname;

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tree':
        return <Tree className="h-5 w-5" />;
      case 'Fish':
        return <Fish className="h-5 w-5" />;
      case 'Sprout':
        return <Sprout className="h-5 w-5" />;
      case 'Bird':
        return <Bird className="h-5 w-5" />;
      case 'Home':
        return <Home className="h-5 w-5" />;
      case 'Bug':
        return <Bug className="h-5 w-5" />;
      case 'Droplets':
        return <Droplets className="h-5 w-5" />;
      case 'Flower2':
        return <Flower2 className="h-5 w-5" />;
      case 'Beef':
        return <Beef className="h-5 w-5" />;
      case 'Sheep':
        return <Sheep className="h-5 w-5" />;
      case 'Camel':
        return <Leaf className="h-5 w-5 rotate-45" />; // Using Leaf as a temporary icon for camel
      case 'Egg':
        return <Egg className="h-5 w-5" />;
      default:
        return <Leaf className="h-5 w-5" />;
    }
  };

  const handleNavigation = (path: string) => {
    onModuleChange(path.replace('/', ''));
    navigate({ to: path });
  };

  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');

  return (
    <div className="h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              {currentOrganization?.name || t('app.name')}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button
          onClick={() => handleNavigation('/dashboard')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/dashboard'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>{t('nav.dashboard')}</span>
        </button>


        <button
          onClick={() => handleNavigation('/soil-analysis')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/soil-analysis'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FileText className="h-5 w-5" />
          <span>{t('nav.soilAnalysis')}</span>
        </button>

        <button
          onClick={() => handleNavigation('/parcels')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/parcels'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Map className="h-5 w-5" />
          <span>{t('nav.parcels')}</span>
        </button>


        <button
          onClick={() => handleNavigation('/stock')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/stock'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Package className="h-5 w-5" />
          <span>{t('nav.stock')}</span>
        </button>

        <button
          onClick={() => handleNavigation('/infrastructure')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/infrastructure'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Building2 className="h-5 w-5" />
          <span>{t('nav.infrastructure')}</span>
        </button>

        <button
          onClick={() => handleNavigation('/farm-hierarchy')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            currentPath === '/farm-hierarchy'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Network className="h-5 w-5" />
          <span>{t('nav.farmHierarchy')}</span>
        </button>

        {/* Personnel Section */}
        <div className="pt-4">
          <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('nav.personnel')}
          </h3>
          <button
            onClick={() => handleNavigation('/employees')}
            className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg transition-colors ${
              currentPath === '/employees'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>{t('nav.employees')}</span>
          </button>
          <button
            onClick={() => handleNavigation('/day-laborers')}
            className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg transition-colors ${
              currentPath === '/day-laborers'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <UserCog className="h-5 w-5" />
            <span>{t('nav.dayLaborers')}</span>
          </button>
        </div>

        {/* Charges Section */}
        <div className="pt-4">
          <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('nav.expenses')}
          </h3>
          <button
            onClick={() => handleNavigation('/utilities')}
            className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg transition-colors ${
              currentPath === '/utilities'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span>{t('nav.utilities')}</span>
          </button>
        </div>

        <div className="pt-4">
          <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Agriculture
          </h3>
          {agricultureModules.map((module) => (
            <button
              key={module.id}
              onClick={() => handleNavigation(`/${module.id}`)}
              className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg transition-colors ${
                currentPath === `/${module.id}`
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {getModuleIcon(module.icon)}
              <span>{module.name}</span>
            </button>
          ))}
        </div>

        <div className="pt-4">
          <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Élevage
          </h3>
          {elevageModules.map((module) => (
            <button
              key={module.id}
              onClick={() => handleNavigation(`/${module.id}`)}
              className={`w-full flex items-center space-x-3 p-3 mt-2 rounded-lg transition-colors ${
                currentPath === `/${module.id}`
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {getModuleIcon(module.icon)}
              <span>{module.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleNavigation('/alerts')}
          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <AlertCircle className="h-5 w-5" />
          <span>Alertes</span>
        </button>

        <button
          onClick={() => handleNavigation('/reports')}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${
            currentPath === '/reports' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : ''
          }`}
        >
          <FileSpreadsheet className="h-5 w-5" />
          <span>{t('nav.reports')}</span>
        </button>

        <button
          onClick={() => handleNavigation('/settings/profile')}
          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <Settings className="h-5 w-5" />
          <span>{t('nav.settings')}</span>
        </button>

        <button
          onClick={onThemeToggle}
          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>{isDarkMode ? t('app.lightMode') : t('app.darkMode')}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
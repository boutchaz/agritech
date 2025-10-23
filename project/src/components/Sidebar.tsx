import React, { useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, Trees as Tree, Fish, Leaf, AlertCircle, Settings, Sun, Moon, Sprout, Bird, Bug, Droplets, Flower2, Beef, Sheet as Sheep, Egg, FileText, Map, Package, Building2, Users, Wallet, FileSpreadsheet, Network, Menu, X, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import type { Module } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from './MultiTenantAuthProvider';
import { ProtectedNavItem } from './authorization/ProtectedNavItem';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAgricultureModules, setShowAgricultureModules] = useState(false);
  const [showElevageModules, setShowElevageModules] = useState(false);

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
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');

  return (
    <>
      {/* Mobile Menu Button - Only shows when menu is closed */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50",
        "h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {currentOrganization?.name || t('app.name')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">AgriTech Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            <ProtectedNavItem action="read" subject="Dashboard">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/dashboard' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/dashboard')}
              >
                <Home className="mr-3 h-4 w-4" />
                {t('nav.dashboard')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Analysis">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/analyses' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/analyses')}
              >
                <FileText className="mr-3 h-4 w-4" />
                {t('nav.analyses')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Parcel">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/parcels' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/parcels')}
              >
                <Map className="mr-3 h-4 w-4" />
                {t('nav.parcels')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Stock">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/stock' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/stock')}
              >
                <Package className="mr-3 h-4 w-4" />
                {t('nav.stock')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Infrastructure">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/infrastructure' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/infrastructure')}
              >
                <Building2 className="mr-3 h-4 w-4" />
                {t('nav.infrastructure')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="FarmHierarchy">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/farm-hierarchy' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/farm-hierarchy')}
              >
                <Network className="mr-3 h-4 w-4" />
                {t('nav.farmHierarchy')}
              </Button>
            </ProtectedNavItem>
          </div>


          {/* Personnel Section */}
          <Separator className="my-3" />
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Personnel
            </h3>

            <ProtectedNavItem action="read" subject="Worker">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/workers' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/workers')}
              >
                <Users className="mr-3 h-4 w-4" />
                {t('nav.personnel')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Task">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/tasks' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/tasks')}
              >
                <CheckSquare className="mr-3 h-4 w-4" />
                {t('nav.tasks')}
              </Button>
            </ProtectedNavItem>
          </div>


          {/* Expenses Section */}
          <ProtectedNavItem action="read" subject="Utility">
            <Separator className="my-3" />
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('nav.expenses')}
              </h3>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/utilities' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={() => handleNavigation('/utilities')}
              >
                <Wallet className="mr-3 h-4 w-4" />
                {t('nav.utilities')}
              </Button>
            </div>
          </ProtectedNavItem>

          {/* Agriculture Modules */}
          {agricultureModules.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                  onClick={() => setShowAgricultureModules(!showAgricultureModules)}
                >
                  Agriculture
                  {showAgricultureModules ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                {showAgricultureModules && agricultureModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === `/${module.id}` && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={() => handleNavigation(`/${module.id}`)}
                  >
                    <span className="mr-3">{getModuleIcon(module.icon)}</span>
                    {module.name}
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Elevage Modules */}
          {elevageModules.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                  onClick={() => setShowElevageModules(!showElevageModules)}
                >
                  Élevage
                  {showElevageModules ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                {showElevageModules && elevageModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === `/${module.id}` && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={() => handleNavigation(`/${module.id}`)}
                  >
                    <span className="mr-3">{getModuleIcon(module.icon)}</span>
                    {module.name}
                  </Button>
                ))}
              </div>
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <ProtectedNavItem action="read" subject="Dashboard">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath === '/alerts' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={() => handleNavigation('/alerts')}
          >
            <AlertCircle className="mr-3 h-4 w-4" />
            Alertes
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Report">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath === '/reports' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={() => handleNavigation('/reports')}
          >
            <FileSpreadsheet className="mr-3 h-4 w-4" />
            {t('nav.reports')}
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath.startsWith('/settings') && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={() => handleNavigation('/settings/profile')}
          >
            <Settings className="mr-3 h-4 w-4" />
            {t('nav.settings')}
          </Button>
        </ProtectedNavItem>

        <Separator className="my-2" />

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={onThemeToggle}
        >
          {isDarkMode ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
          {isDarkMode ? t('app.lightMode') : t('app.darkMode')}
        </Button>
      </div>
      </div>
    </>
  );
};

export default Sidebar;
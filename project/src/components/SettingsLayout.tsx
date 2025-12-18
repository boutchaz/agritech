import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Building, Boxes, Users, Sliders, LayoutGrid, CreditCard, User, FileText, Package, Menu, X, ArrowLeft, FolderTree, Link2 } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { useTranslation } from 'react-i18next';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Define menu items with role requirements
  const allMenuItems = useMemo(() => [
    {
      id: 'profile',
      name: t('settings.menu.profile'),
      icon: User,
      path: '/settings/profile',
      description: t('settings.menu.profileDescription'),
      roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer'] // All roles
    },
    {
      id: 'preferences',
      name: t('settings.menu.preferences'),
      icon: Sliders,
      path: '/settings/preferences',
      description: t('settings.menu.preferencesDescription'),
      roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer'] // All roles
    },
    {
      id: 'organization',
      name: t('settings.menu.organization'),
      icon: Building,
      path: '/settings/organization',
      description: t('settings.menu.organizationDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'subscription',
      name: t('settings.menu.subscription'),
      icon: CreditCard,
      path: '/settings/subscription',
      description: t('settings.menu.subscriptionDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'modules',
      name: t('settings.menu.modules'),
      icon: Boxes,
      path: '/settings/modules',
      description: t('settings.menu.modulesDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'users',
      name: t('settings.menu.users'),
      icon: Users,
      path: '/settings/users',
      description: t('settings.menu.usersDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'work-units',
      name: t('settings.menu.workUnits'),
      icon: Package,
      path: '/settings/work-units',
      description: t('settings.menu.workUnitsDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'cost-centers',
      name: t('settings.menu.costCenters', 'Cost Centers'),
      icon: FolderTree,
      path: '/settings/cost-centers',
      description: t('settings.menu.costCentersDescription', 'Manage cost centers for expense tracking'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'account-mappings',
      name: t('settings.menu.accountMappings', 'Account Mappings'),
      icon: Link2,
      path: '/settings/account-mappings',
      description: t('settings.menu.accountMappingsDescription', 'Configure automatic journal entry mappings'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    },
    {
      id: 'dashboard',
      name: t('settings.menu.dashboard'),
      icon: LayoutGrid,
      path: '/settings/dashboard',
      description: t('settings.menu.dashboardDescription'),
      roles: ['system_admin', 'organization_admin', 'farm_manager'] // Admin and managers
    },
    {
      id: 'documents',
      name: t('settings.menu.documents'),
      icon: FileText,
      path: '/settings/documents',
      description: t('settings.menu.documentsDescription'),
      roles: ['system_admin', 'organization_admin'] // Admin only
    }
  ], [t]);

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (!userRole) return [];
    return allMenuItems.filter(item => item.roles.includes(userRole.role_name));
  }, [allMenuItems, userRole]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate({ to: path });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-full relative">
      {/* Mobile Menu Button - Fixed and always visible on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-2xl flex items-center justify-center transition-all active:scale-95"
        aria-label="Toggle settings menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Settings Navigation Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-[50]
        w-full sm:w-80
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="p-3 sm:p-4 space-y-2">
          {/* Back to Dashboard button - only on mobile */}
          <button
            onClick={() => {
              navigate({ to: '/' });
              setIsMobileMenuOpen(false);
            }}
            className="md:hidden w-full text-left p-3 sm:p-4 rounded-lg transition-colors group bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 mb-4"
          >
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-start text-sm sm:text-base text-gray-900 dark:text-white">
                  {t('settings.backToDashboard') || 'Back to Dashboard'}
                </div>
                <div className="text-xs sm:text-sm mt-1 text-start text-gray-500 dark:text-gray-400">
                  {t('settings.returnToMainApp') || 'Return to main app'}
                </div>
              </div>
            </div>
          </button>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg transition-colors group ${
                  active
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-start text-sm sm:text-base ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {item.name}
                    </div>
                    <div className={`text-xs sm:text-sm mt-1 text-start ${
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
      <div className="flex-1 overflow-auto w-full pb-20 md:pb-0">
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;
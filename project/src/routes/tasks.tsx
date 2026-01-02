import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckSquare, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useSidebarMargin } from '../hooks/useSidebarLayout';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: []
  },
];

function TasksLayout() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('tasks');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const { style: sidebarStyle } = useSidebarMargin();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('tasks.loading')}</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/tasks', label: t('tasks.list'), icon: CheckSquare, tourId: undefined },
    { to: '/tasks/calendar', label: t('tasks.calendar'), icon: Calendar, tourId: 'task-calendar' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out" style={sidebarStyle}>
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: CheckSquare, label: t('nav.tasks'), isActive: true }
          ]}
          title={t('tasks.title')}
          subtitle={t('tasks.subtitle')}
        />

        <div className="p-3 sm:p-4 lg:p-6">
          {/* Navigation Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label={t('tasks.navigation')}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-tour={item.tourId}
                    className={cn(
                      "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Route Content */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/tasks')({
  component: withRouteProtection(TasksLayout, 'read', 'Task'),
});

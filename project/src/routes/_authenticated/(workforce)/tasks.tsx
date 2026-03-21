import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { CheckSquare, Calendar, Building2, Columns3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '@/components/ui/loader';

function TasksLayout() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();

  // Detect if we're on a specific task detail page (e.g. /tasks/some-uuid)
  const isTaskDetailPage = /^\/tasks\/[a-f0-9-]{36}/.test(location.pathname);

  if (!currentOrganization) {
    return <PageLoader />;
  }

  const navItems = [
    { to: '/tasks', label: t('tasks.list'), icon: CheckSquare, tourId: undefined },
    { to: '/tasks/calendar', label: t('tasks.calendar'), icon: Calendar, tourId: 'task-calendar' },
    { to: '/tasks/kanban', label: t('tasks.kanban', 'Board'), icon: Columns3, tourId: 'task-kanban' },
  ];

  return (
    <>
      {!isTaskDetailPage && (
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: CheckSquare, label: t('nav.tasks'), isActive: true }
          ]}
          title={t('tasks.title')}
          subtitle={t('tasks.subtitle')}
        />
      )}

      <div className="p-3 sm:p-4 lg:p-6">
        {/* Navigation Tabs - hide on task detail page */}
        {!isTaskDetailPage && (
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label={t('tasks.navigation')}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.to === '/tasks'
                  ? location.pathname === item.to || location.pathname === '/tasks/'
                  : location.pathname.startsWith(item.to);

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
        )}

        {/* Route Content */}
        <Outlet />
      </div>
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks')({
  component: withRouteProtection(TasksLayout, 'read', 'Task'),
});

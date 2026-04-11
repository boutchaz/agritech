import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { CheckSquare, Calendar, Building2, Columns3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import ModernPageHeader from '@/components/ModernPageHeader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '@/components/ui/loader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function TasksLayout() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();

  useAutoStartTour('tasks', 1500);

  // Detect if we're on a specific task detail page (e.g. /tasks/some-uuid)
  const isTaskDetailPage = /^\/tasks\/[a-f0-9-]{36}/.test(location.pathname);

  if (!currentOrganization) {
    return <PageLoader />;
  }

  const navItems = [
    {
      to: '/tasks',
      value: 'list' as const,
      label: t('tasks.list'),
      icon: CheckSquare,
      tourId: undefined,
    },
    {
      to: '/tasks/calendar',
      value: 'calendar' as const,
      label: t('tasks.calendar'),
      icon: Calendar,
      tourId: 'task-calendar',
    },
    {
      to: '/tasks/kanban',
      value: 'kanban' as const,
      label: t('tasks.kanban', 'Board'),
      icon: Columns3,
      tourId: 'task-kanban',
    },
  ];

  const activeTab =
    location.pathname.startsWith('/tasks/kanban')
      ? 'kanban'
      : location.pathname.startsWith('/tasks/calendar')
        ? 'calendar'
        : 'list';

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
          <div className="mb-6">
            <Tabs value={activeTab} className="w-full">
              <TabsList aria-label={t('tasks.navigation')} className="h-auto w-full min-w-0 justify-start">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger key={item.to} value={item.value} asChild>
                      <Link to={item.to} data-tour={item.tourId}>
                        <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
                        {item.label}
                      </Link>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
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

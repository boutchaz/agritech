import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Bell } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

const NotificationsPage: React.FC = () => {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="notifications"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Bell, label: 'Notifications', isActive: true },
          ]}
          title="Notifications"
          subtitle="Manage your notifications and stay up to date"
        />
      }
    >
      <NotificationCenter standalone />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(misc)/notifications')({
  component: NotificationsPage,
});

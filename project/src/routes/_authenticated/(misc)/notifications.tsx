import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Bell } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SectionLoader } from '@/components/ui/loader';


const NotificationsPage: React.FC = () => {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <SectionLoader />
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

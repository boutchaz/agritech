import React from 'react';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { createFileRoute } from '@tanstack/react-router';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Bot } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  // Set page title
  React.useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'Agritech Suite';
    const title = `${organizationName} | ${t('chat.title', 'AI Assistant')}`;
    document.title = title;
  }, [currentOrganization, t]);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('common.loading', 'Loading...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
          ...(currentFarm ? [{ icon: Building2, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: Bot, label: t('chat.title', 'AI Assistant'), isActive: true },
        ]}
        title={t('chat.title', 'AI Assistant')}
        subtitle={t('chat.subtitle', 'Ask questions about your farm, workers, accounting, and more')}
      />

      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto h-[calc(100vh-14rem)]">
          <ChatInterface />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(core)/chat')({
  component: withRouteProtection(ChatPage, 'read', 'Chat'),
});

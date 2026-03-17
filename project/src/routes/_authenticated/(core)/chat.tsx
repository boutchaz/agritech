import React from 'react';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { createFileRoute } from '@tanstack/react-router';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/loader';

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
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          ...(currentFarm ? [{ icon: Building2, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: Bot, label: t('chat.title', 'AI Assistant'), isActive: true },
        ]}
        title={t('chat.title', 'AI Assistant')}
        subtitle={t('chat.subtitle', 'Ask questions about your farm, workers, accounting, and more')}
      />

      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto" style={{ height: 'calc(100vh - 12rem)' }}>
          <ChatInterface />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(core)/chat')({
  component: withRouteProtection(ChatPage, 'read', 'Chat'),
});

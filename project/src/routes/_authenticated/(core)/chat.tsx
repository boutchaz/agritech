import React from 'react';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { createFileRoute } from '@tanstack/react-router';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Building2, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/loader';

const ChatPage = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  // Set page title
  React.useEffect(() => {
    const organizationName = currentOrganization?.name ?? 'AgroGina Suite';
    const title = `${organizationName} | ${t('chat.title', 'AI Assistant')}`;
    document.title = title;
  }, [currentOrganization, t]);

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <div className="flex h-full min-h-0 w-full max-h-full flex-1 flex-col overflow-hidden">
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          ...(currentFarm?.name ? [{ icon: Building2, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
          { icon: Bot, label: t('chat.title', 'AI Assistant'), isActive: true },
        ]}
        title={t('chat.title', 'AI Assistant')}
        subtitle={t('chat.subtitle', 'Ask questions about your farm, workers, accounting, and more')}
      />

      {/* No bottom padding: main already reserves space for mobile nav / safe area; extra pb felt like a large gap */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 pb-0 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6">
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col min-h-[min(28rem,calc(100dvh-12rem))]">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(core)/chat')({
  component: withRouteProtection(ChatPage, 'read', 'Chat'),
});

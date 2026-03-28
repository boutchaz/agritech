import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import InfrastructureManagement from '@/components/InfrastructureManagement'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Building2, Building } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageLoader } from '@/components/ui/loader';


const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  return (
    <PageLayout
      activeModule="infrastructure"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building, label: currentOrganization.name, path: '/dashboard' },
            { icon: Building2, label: t('nav.infrastructure'), isActive: true }
          ]}
          title={t('nav.infrastructure')}
          subtitle={t('infrastructure.subtitle')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <InfrastructureManagement />
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(misc)/infrastructure')({
  component: AppContent,
})

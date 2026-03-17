import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import InfrastructureManagement from '@/components/InfrastructureManagement'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Building2, Building } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading')}</p>
        </div>
      </div>
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

import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ProductionDashboard } from '@/components/ProductionIntelligence/ProductionDashboard';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Building2, BarChart3, Home } from 'lucide-react';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('production.intelligence.loadingOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="production-intelligence"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
            { icon: BarChart3, label: t('production.intelligence.pageTitle'), isActive: true }
          ]}
          title={t('production.intelligence.pageTitle')}
          subtitle={t('production.intelligence.subtitle')}
        />
      }
    >
      <div className="p-6">
        <ProductionDashboard />
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/production/intelligence')({
  component: withRouteProtection(AppContent, 'read', 'Analysis'),
});

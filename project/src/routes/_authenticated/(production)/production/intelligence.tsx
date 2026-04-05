
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ProductionDashboard } from '@/components/ProductionIntelligence/ProductionDashboard';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Building2, BarChart3, Home } from 'lucide-react';
import { PageLoader } from '@/components/ui/loader';


const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  return (
    <PageLayout
      activeModule="production-intelligence"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
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

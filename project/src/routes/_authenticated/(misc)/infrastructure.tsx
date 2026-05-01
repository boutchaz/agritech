
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useAutoStartTour } from '@/contexts/TourContext'
import { PageLayout } from '@/components/PageLayout'
import InfrastructureManagement from '@/components/InfrastructureManagement'
import EquipmentManagement from '@/components/EquipmentManagement'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Building2, Building } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageLoader } from '@/components/ui/loader';
import { useState } from 'react'


const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<'infrastructure' | 'equipment'>('infrastructure');

  useAutoStartTour('infrastructure', 1500);

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
            { icon: Building2, label: t('nav.infrastructureEquipment', 'Infrastructure & Equipment'), isActive: true }
          ]}
          title={t('nav.infrastructureEquipment', 'Infrastructure & Equipment')}
          subtitle={t('infrastructure.subtitle')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex gap-1 mb-4 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'infrastructure'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('infrastructure')}
          >
            {t('infrastructure.tabInfra', 'Infrastructure')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'equipment'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('equipment')}
          >
            {t('infrastructure.tabEquipment', 'Equipment')}
          </button>
        </div>

        {activeTab === 'infrastructure' ? (
          <InfrastructureManagement />
        ) : (
          <EquipmentManagement />
        )}
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(misc)/infrastructure')({
  component: AppContent,
})

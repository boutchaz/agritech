import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ProductionTabs } from '@/components/Production/ProductionTabs';
import { ClipboardCheck, Building2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import QualityControlList from '@/components/QualityControl/QualityControlList';
import QualityControlForm from '@/components/QualityControl/QualityControlForm';

function QualityControlPage() {
  const { t } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const [formOpen, setFormOpen] = useState(false);

  if (!currentOrganization) {
    return (
      <SectionLoader />
    );
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: ClipboardCheck, label: t('production.qualityControl.breadcrumbLabel'), isActive: true }
        ]}
        title={t('production.qualityControl.title')}
        subtitle={t('production.qualityControl.subtitle')}
        actions={
          <Button type="button" variant="default" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('production.qualityControl.newInspection', 'New Inspection')}
          </Button>
        }
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ProductionTabs />
        <QualityControlList />
      </div>

      <QualityControlForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/quality-control')({
  component: QualityControlPage,
});

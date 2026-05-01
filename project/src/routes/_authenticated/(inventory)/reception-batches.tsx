import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';

import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import ReceptionBatchDetail from '@/components/Stock/ReceptionBatchDetail';
import { Building2, ClipboardCheck } from 'lucide-react';
import type { ReceptionBatch } from '@/types/reception';
import { SectionLoader } from '@/components/ui/loader';


function ReceptionBatchesPage() {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<ReceptionBatch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ReceptionBatch | null>(null);
  const search = Route.useSearch();
  const defaultHarvestId = search.harvest_id;

  // Auto-open form when harvest_id is in URL (from harvest page link)
  useEffect(() => {
    if (defaultHarvestId && !showForm) {
      setShowForm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultHarvestId]);

  const handleViewBatch = (batch: ReceptionBatch) => {
    setSelectedBatch(batch);
  };

  const handleEditBatch = (batch: ReceptionBatch) => {
    setBatchToEdit(batch);
    setShowForm(true);
  };

  const handleFormClose = (open: boolean) => {
    setShowForm(open);
    if (!open) {
      setBatchToEdit(null);
    }
  };

  const handleCreateClick = () => {
    setBatchToEdit(null);
    setShowForm(true);
  };

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
          { icon: ClipboardCheck, label: t('receptionBatches.title'), isActive: true }
        ]}
        title={t('receptionBatches.title')}
        subtitle={t('receptionBatches.subtitle')}
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ReceptionBatchList
          onCreateClick={handleCreateClick}
          onViewClick={handleViewBatch}
          onEditClick={handleEditBatch}
        />
      </div>

      <ReceptionBatchForm
        open={showForm}
        onOpenChange={handleFormClose}
        defaultHarvestId={defaultHarvestId}
        batchToEdit={batchToEdit as unknown as Record<string, unknown> | undefined}
      />

      <ReceptionBatchDetail
        batchId={selectedBatch?.id ?? null}
        open={!!selectedBatch}
        onOpenChange={(open) => { if (!open) setSelectedBatch(null); }}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(inventory)/reception-batches')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      harvest_id: search.harvest_id as string | undefined,
    };
  },
  component: ReceptionBatchesPage,
});

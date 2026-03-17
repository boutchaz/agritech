import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';

import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import { Building2, ClipboardCheck } from 'lucide-react';
import type { ReceptionBatch } from '@/types/reception';

function ReceptionBatchesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<ReceptionBatch | null>(null);
  const [_selectedBatch, setSelectedBatch] = useState<ReceptionBatch | null>(null);
  const search = Route.useSearch();
  const defaultHarvestId = search.harvest_id;

  useEffect(() => {
    if (defaultHarvestId) {
      setShowForm(true);
    }
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
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('receptionBatches.loading')}</p>
        </div>
      </div>
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
        batchToEdit={batchToEdit}
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

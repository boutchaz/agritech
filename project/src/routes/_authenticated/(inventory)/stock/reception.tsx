import { useState } from "react";
import { createFileRoute } from '@tanstack/react-router';
import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import ReceptionBatchDetail from '@/components/Stock/ReceptionBatchDetail';
import type { ReceptionBatch } from '@/types/reception';

function ReceptionPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editBatch, setEditBatch] = useState<ReceptionBatch | undefined>(undefined);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

  const handleViewBatch = (batch: ReceptionBatch) => {
    setDetailBatchId(batch.id);
  };

  const handleEditBatch = (batch: ReceptionBatch) => {
    setEditBatch(batch);
    setShowCreateForm(true);
  };

  return (
    <div>
      <ReceptionBatchList
        onCreateClick={() => { setEditBatch(undefined); setShowCreateForm(true); }}
        onViewClick={handleViewBatch}
        onEditClick={handleEditBatch}
      />

      <ReceptionBatchForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        batchToEdit={editBatch as unknown as Record<string, unknown>}
      />

      <ReceptionBatchDetail
        batchId={detailBatchId}
        open={!!detailBatchId}
        onOpenChange={(open) => { if (!open) setDetailBatchId(null); }}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/reception')({
  component: ReceptionPage,
});

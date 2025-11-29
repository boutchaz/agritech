import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import type { ReceptionBatch } from '@/types/reception';

function ReceptionBatchesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [_selectedBatch, setSelectedBatch] = useState<ReceptionBatch | null>(null);

  const handleViewBatch = (batch: ReceptionBatch) => {
    setSelectedBatch(batch);
    // TODO: Open batch detail dialog
  };

  return (
    <div className="min-h-screen">
      <ReceptionBatchList
        onCreateClick={() => setShowCreateForm(true)}
        onViewClick={handleViewBatch}
      />

      <ReceptionBatchForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </div>
  );
}

export const Route = createFileRoute('/reception-batches')({
  component: ReceptionBatchesPage,
});

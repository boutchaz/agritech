import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import type { ReceptionBatch } from '@/types/reception';

function ReceptionPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ReceptionBatch | null>(null);

  const handleViewBatch = (batch: ReceptionBatch) => {
    setSelectedBatch(batch);
    // TODO: Open batch detail dialog
  };

  return (
    <div>
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

export const Route = createFileRoute('/stock/reception')({
  component: ReceptionPage,
});

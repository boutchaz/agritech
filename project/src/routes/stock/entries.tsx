import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import StockEntryList from '../../components/Stock/StockEntryList';
import StockEntryForm from '../../components/Stock/StockEntryForm';
import StockEntryDetail from '../../components/Stock/StockEntryDetail';
import type { StockEntry } from '../../types/stock-entries';

const StockEntriesPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const handleViewClick = (entry: StockEntry) => {
    setSelectedEntryId(entry.id);
  };

  return (
    <>
      <StockEntryList
        onCreateClick={() => setIsFormOpen(true)}
        onViewClick={handleViewClick}
      />
      <StockEntryForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      <StockEntryDetail
        entryId={selectedEntryId}
        open={!!selectedEntryId}
        onOpenChange={(open) => !open && setSelectedEntryId(null)}
      />
    </>
  );
};

export const Route = createFileRoute('/stock/entries')({
  component: StockEntriesPage,
});

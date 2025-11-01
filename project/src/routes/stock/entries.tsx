import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import StockEntryList from '../../components/Stock/StockEntryList';
import StockEntryForm from '../../components/Stock/StockEntryForm';

const StockEntriesPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <StockEntryList
        onCreateClick={() => setIsFormOpen(true)}
        onViewClick={() => {
          // TODO: implement dedicated detail drawer once available
        }}
      />
      <StockEntryForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </>
  );
};

export const Route = createFileRoute('/stock/entries')({
  component: StockEntriesPage,
});

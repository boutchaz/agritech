import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import StockEntryList from '@/components/Stock/StockEntryList';
import StockEntryForm from '@/components/Stock/StockEntryForm';
import StockEntryDetail from '@/components/Stock/StockEntryDetail';
import type { StockEntry, StockEntryType } from '@/types/stock-entries';

const STOCK_ENTRY_TYPES: StockEntryType[] = [
  'Material Receipt',
  'Material Issue',
  'Stock Transfer',
  'Stock Reconciliation',
];

const isStockEntryType = (value: string): value is StockEntryType => STOCK_ENTRY_TYPES.includes(value as StockEntryType);

const StockEntriesPage = () => {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [formDefaults, setFormDefaults] = useState<{ type: StockEntryType; itemId?: string } | null>(null);

  const normalizedType = useMemo<StockEntryType>(
    () => (search.type && isStockEntryType(search.type) ? search.type : 'Material Receipt'),
    [search.type],
  );

  const handleViewClick = (entry: StockEntry) => {
    setSelectedEntryId(entry.id);
  };

  useEffect(() => {
    if (!search.type && !search.item_id) {
      return;
    }

    setFormDefaults({
      type: normalizedType,
      itemId: search.item_id || undefined,
    });
    setIsFormOpen(true);

    void navigate({
      to: '/stock/entries',
      search: () => ({}),
      replace: true,
    });
  }, [navigate, normalizedType, search.item_id, search.type]);

  const handleCreateClick = () => {
    setFormDefaults(null);
    setIsFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setFormDefaults(null);
    }
  };

  return (
    <>
      <StockEntryList
        onCreateClick={handleCreateClick}
        onViewClick={handleViewClick}
      />
      <StockEntryForm
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        defaultType={formDefaults?.type}
        prefilledItemId={formDefaults?.itemId}
      />
      <StockEntryDetail
        entryId={selectedEntryId}
        open={!!selectedEntryId}
        onOpenChange={(open) => !open && setSelectedEntryId(null)}
      />
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock/entries')({
  component: StockEntriesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === 'string' ? search.type : undefined,
    item_id: typeof search.item_id === 'string' ? search.item_id : undefined,
  }),
});

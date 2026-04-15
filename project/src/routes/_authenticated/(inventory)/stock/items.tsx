import { createFileRoute } from '@tanstack/react-router'

import ItemManagement from '@/components/Stock/ItemManagement';

function ItemsPage() {
  const search = Route.useSearch();

  return <ItemManagement selectedItemId={search.itemId} />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/items')({
  component: ItemsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    itemId: typeof search.itemId === 'string' ? search.itemId : undefined,
  }),
});


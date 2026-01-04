import { createFileRoute } from '@tanstack/react-router'

import ItemManagement from '@/components/Stock/ItemManagement';

function ItemsPage() {
  return <ItemManagement />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/items')({
  component: ItemsPage,
});


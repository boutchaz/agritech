import { createFileRoute, Navigate } from '@tanstack/react-router';

const InventoryIndexRedirect = () => <Navigate to="/stock/inventory/stock" replace />;

export const Route = createFileRoute('/stock/inventory/')({
  component: InventoryIndexRedirect,
});

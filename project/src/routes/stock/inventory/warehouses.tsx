import { createFileRoute } from '@tanstack/react-router';
import WarehouseManagement from '@/components/Inventory/WarehouseManagement';

export const Route = createFileRoute('/stock/inventory/warehouses')({
  component: WarehouseManagement,
});

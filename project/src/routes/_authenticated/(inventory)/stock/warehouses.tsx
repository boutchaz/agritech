import { createFileRoute } from '@tanstack/react-router';
import WarehouseManagement from '@/components/Inventory/WarehouseManagement';

export const Route = createFileRoute('/_authenticated/(inventory)/stock/warehouses')({
  component: WarehouseManagement,
});

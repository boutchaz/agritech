import { createFileRoute } from '@tanstack/react-router';
import SupplierManagement from '@/components/Inventory/SupplierManagement';

export const Route = createFileRoute('/stock/suppliers')({
  component: SupplierManagement,
});

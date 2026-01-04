import { createFileRoute } from '@tanstack/react-router';
import SupplierManagement from '@/components/Inventory/SupplierManagement';

export const Route = createFileRoute('/_authenticated/(inventory)/stock/suppliers')({
  component: SupplierManagement,
});

import { createFileRoute } from '@tanstack/react-router';
import InventoryStock from '@/components/Stock/InventoryStock';

const StockInventoryRoute = () => {
  return <InventoryStock />;
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock/inventory')({
  component: StockInventoryRoute,
});

import { createFileRoute } from '@tanstack/react-router';
import InventoryStock from '@/components/Stock/InventoryStock';

const StockInventoryStockRoute = () => {
  return <InventoryStock />;
};

export const Route = createFileRoute('/stock/inventory/stock')({
  component: StockInventoryStockRoute,
});

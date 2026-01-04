import { createFileRoute } from '@tanstack/react-router';
import InventoryStock from '@/components/Stock/InventoryStock';

const StockInventoryStockRoute = () => {
  return <InventoryStock />;
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock/stock')({
  component: StockInventoryStockRoute,
});

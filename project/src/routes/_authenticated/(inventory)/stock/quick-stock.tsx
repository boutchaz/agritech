import { createFileRoute } from '@tanstack/react-router';
import QuickStockEntry from '@/components/Stock/QuickStockEntry';

function QuickStockPage() {
  return <QuickStockEntry />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/quick-stock')({
  component: QuickStockPage,
});

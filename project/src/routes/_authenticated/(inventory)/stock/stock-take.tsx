import { createFileRoute } from '@tanstack/react-router';
import StockTakeWizard from '@/components/Stock/StockTakeWizard';

function StockTakePage() {
  return <StockTakeWizard />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/stock-take')({
  component: StockTakePage,
});

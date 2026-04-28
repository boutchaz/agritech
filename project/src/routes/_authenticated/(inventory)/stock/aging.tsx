import { createFileRoute } from '@tanstack/react-router';
import { StockAgingReport } from '@/components/Stock/StockAgingReport';

function StockAgingPage() {
  return <StockAgingReport />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/aging')({
  component: StockAgingPage,
});

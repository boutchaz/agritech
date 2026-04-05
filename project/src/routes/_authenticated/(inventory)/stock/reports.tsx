
import { createFileRoute } from '@tanstack/react-router';
import StockReportsDashboard from '@/components/Stock/StockReportsDashboard';

const StockReportsPage = () => {
  return <StockReportsDashboard />;
};

export const Route = createFileRoute('/_authenticated/(inventory)/stock/reports')({
  component: StockReportsPage,
});

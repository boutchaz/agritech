import { createFileRoute } from '@tanstack/react-router';
import StockDashboard from '@/components/Stock/StockDashboard';

function DashboardPage() {
  return <StockDashboard />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/dashboard')({
  component: DashboardPage,
});

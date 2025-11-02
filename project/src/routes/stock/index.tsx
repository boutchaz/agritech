import { createFileRoute, Navigate } from '@tanstack/react-router';

const StockIndexRedirect = () => <Navigate to="/stock/items" replace />;

export const Route = createFileRoute('/stock/')({
  component: StockIndexRedirect,
});

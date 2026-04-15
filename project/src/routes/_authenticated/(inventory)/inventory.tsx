import { createFileRoute, Outlet, Navigate, useLocation } from '@tanstack/react-router';

const StockInventoryLayout = () => {
  const location = useLocation();

  // Redirect bare /inventory to /inventory/reception-batches
  if (location.pathname === '/inventory' || location.pathname === '/inventory/') {
    return <Navigate to="/inventory/reception-batches" replace />;
  }

  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(inventory)/inventory')({
  component: StockInventoryLayout,
});

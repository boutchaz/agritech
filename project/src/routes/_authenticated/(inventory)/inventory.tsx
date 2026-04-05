
import { createFileRoute, Outlet } from '@tanstack/react-router';

const StockInventoryLayout = () => {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(inventory)/inventory')({
  component: StockInventoryLayout,
});

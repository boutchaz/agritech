import React from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

const StockInventoryLayout: React.FC = () => {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/stock/inventory')({
  component: StockInventoryLayout,
});

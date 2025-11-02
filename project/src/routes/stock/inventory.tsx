import React, { useMemo } from 'react';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import StockManagement, { type InventoryTab } from '../../components/StockManagement';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Users, Warehouse } from 'lucide-react';

const tabConfig: Array<{ value: InventoryTab; label: string; to: string; icon: React.ReactNode }> = [
  { value: 'stock', label: 'Stock', to: '/stock/inventory/stock', icon: <Package className="h-4 w-4" /> },
  { value: 'suppliers', label: 'Fournisseurs', to: '/stock/inventory/suppliers', icon: <Users className="h-4 w-4" /> },
  { value: 'warehouses', label: 'Entrepôts', to: '/stock/inventory/warehouses', icon: <Warehouse className="h-4 w-4" /> },
];

const StockInventoryLayout: React.FC = () => {
  const router = useRouter();
  const { location } = useRouterState();

  const activeTab = useMemo<InventoryTab>(() => {
    const pathname = location?.pathname ?? '';
    if (pathname.startsWith('/stock/inventory/suppliers')) return 'suppliers';
    if (pathname.startsWith('/stock/inventory/warehouses')) return 'warehouses';
    return 'stock';
  }, [location?.pathname]);

  const handleTabChange = (value: string) => {
    const tab = tabConfig.find((t) => t.value === value);
    if (!tab) return;
    router.navigate({ to: tab.to });
  };

  // Don't render StockManagement for stock tab - InventoryStock component handles it
  const shouldShowStockManagement = activeTab !== 'stock';

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {tabConfig.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {shouldShowStockManagement && <StockManagement activeTab={activeTab} />}
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/stock/inventory')({
  component: StockInventoryLayout,
});

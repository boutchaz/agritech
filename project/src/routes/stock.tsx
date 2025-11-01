import React, { useMemo, useState } from 'react';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
];

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const router = useRouter();
  const { location } = useRouterState();
  const [activeModule, setActiveModule] = useState('stock');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const tabs = useMemo(
    () => [
      { value: 'inventory', label: 'Inventory & Purchases', to: '/stock/inventory' },
      { value: 'entries', label: 'Stock Entries', to: '/stock/entries' },
      { value: 'reports', label: 'Reports & Analytics', to: '/stock/reports' },
    ],
    [],
  );

  const activeTab = useMemo(() => {
    if (!location) return 'inventory';
    if (location.pathname.startsWith('/stock/entries')) return 'entries';
    if (location.pathname.startsWith('/stock/reports')) return 'reports';
    return 'inventory';
  }, [location]);

  const handleTabChange = (value: string) => {
    const target = tabs.find((tab) => tab.value === value);
    if (!target) return;
    router.navigate({ to: target.to });
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: Package, label: 'Stock Management', isActive: true }
          ]}
          title="Stock Management"
          subtitle="Comprehensive inventory, entries, and warehouse management"
        />

        <div className="p-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/stock')({
  component: withRouteProtection(AppContent, 'read', 'Stock'),
});

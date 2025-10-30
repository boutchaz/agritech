import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FlaskConical, Calendar, Package, TrendingUp, Building2, Home } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLabServiceProviders,
  useLabServiceTypes,
  useLabServiceOrders,
  useSampleCollectionSchedules,
  type ServiceCategory,
} from '@/hooks/useLabServices';
import { LabServiceMarketplace } from '@/components/LabServices/LabServiceMarketplace';
import { LabOrdersList } from '@/components/LabServices/LabOrdersList';
import { SampleSchedulesList } from '@/components/LabServices/SampleSchedulesList';
import type { Module } from '@/types';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: []
  },
];

export const Route = createFileRoute('/lab-services')({
  component: LabServicesPage,
});

function LabServicesPage() {
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('lab-services');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | undefined>();

  const { data: providers, isLoading: loadingProviders } = useLabServiceProviders();
  const { data: serviceTypes, isLoading: loadingTypes } = useLabServiceTypes(undefined, selectedCategory);
  const { data: orders, isLoading: loadingOrders } = useLabServiceOrders();
  const { data: schedules, isLoading: loadingSchedules } = useSampleCollectionSchedules();

  // Calculate statistics
  const stats = {
    activeOrders: orders?.filter(o => ['pending', 'sample_collected', 'sent_to_lab', 'in_progress'].includes(o.status)).length || 0,
    completedOrders: orders?.filter(o => o.status === 'completed').length || 0,
    upcomingCollections: schedules?.filter(s => {
      const nextDate = new Date(s.next_collection_date);
      const today = new Date();
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    }).length || 0,
    availableServices: serviceTypes?.length || 0,
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
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
        <SubscriptionBanner />
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            ...(currentFarm ? [{ icon: Home, label: currentFarm.name, path: '/farm-hierarchy' }] : []),
            { icon: FlaskConical, label: 'Services de Laboratoire', isActive: true }
          ]}
          title="Services de Laboratoire"
          subtitle="Programmez des analyses de sol et foliaires, suivez les échantillons et intégrez les résultats dans vos recommandations"
        />
        <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Commandes actives</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeOrders}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Analyses terminées</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.completedOrders}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prélèvements à venir (7j)</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.upcomingCollections}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services disponibles</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.availableServices}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="marketplace">Services</TabsTrigger>
              <TabsTrigger value="orders">Mes Commandes</TabsTrigger>
              <TabsTrigger value="schedules">Programmation</TabsTrigger>
            </TabsList>

            <TabsContent value="marketplace" className="space-y-6">
              <LabServiceMarketplace
                providers={providers || []}
                serviceTypes={serviceTypes || []}
                isLoading={loadingProviders || loadingTypes}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <LabOrdersList orders={orders || []} isLoading={loadingOrders} />
            </TabsContent>

            <TabsContent value="schedules" className="space-y-6">
              <SampleSchedulesList schedules={schedules || []} isLoading={loadingSchedules} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

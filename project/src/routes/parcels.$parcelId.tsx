import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import { useParcelById, useFarms } from '../hooks/useParcelsQuery'
import Sidebar from '../components/Sidebar'
import ModernPageHeader from '../components/ModernPageHeader'
import { Building2, TreePine, MapPin, ChartBar, FlaskRound as Flask, Satellite, Cloud, DollarSign, FileSpreadsheet } from 'lucide-react'
import type { Module } from '../types'

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

const ParcelLayout = () => {
  const { parcelId } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization } = useAuth();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const { data: farms = [] } = useFarms(currentOrganization?.id);

  console.log('🔍 ParcelLayout RENDERED!', {
    parcelId,
    isLoading,
    hasParcel: !!parcel,
    parcelName: parcel?.name,
    currentOrg: currentOrganization?.name
  });

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: ChartBar, path: `/parcels/${parcelId}` },
    { id: 'soil', name: 'Analyse Sol', icon: Flask, path: `/parcels/${parcelId}/soil` },
    { id: 'satellite', name: 'Imagerie', icon: Satellite, path: `/parcels/${parcelId}/satellite` },
    { id: 'weather', name: 'Météo & Climat', icon: Cloud, path: `/parcels/${parcelId}/weather` },
    { id: 'profitability', name: 'Rentabilité', icon: DollarSign, path: `/parcels/${parcelId}/profitability` },
    { id: 'reports', name: 'Rapports', icon: FileSpreadsheet, path: `/parcels/${parcelId}/reports` },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de la parcelle...</p>
        </div>
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Parcelle non trouvée</p>
          <button
            onClick={() => navigate({ to: '/parcels', search: { farmId: undefined } })}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retour aux parcelles
          </button>
        </div>
      </div>
    );
  }

  const farm = farms.find(f => f.id === parcel.farm_id);

  console.log('ParcelLayout rendering:', { parcelId, parcel: parcel?.name, tabsCount: tabs.length });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        modules={mockModules.filter(m => m.active)}
        activeModule="parcels"
        onModuleChange={() => {}}
        isDarkMode={false}
        onThemeToggle={() => {}}
      />
      <main className="flex-1 w-full lg:w-auto">
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization?.name || '', path: '/settings/organization' },
            { icon: TreePine, label: farm?.name || 'Ferme', path: '/farms' },
            { icon: MapPin, label: 'Parcelles', path: '/parcels' },
            { icon: MapPin, label: parcel.name, isActive: true }
          ]}
          title={parcel.name}
          subtitle={`${parcel.calculated_area || parcel.area || 0} ha${farm ? ` • ${farm.name}` : ''}`}
        />

        {/* Tabs Navigation */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-b-4 border-green-500 py-4">
          <div className="container mx-auto px-6">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate({ to: tab.path })}
                    className={`
                      flex items-center space-x-3 px-6 py-4 rounded-lg font-medium text-base shadow-md transition-all transform hover:scale-105
                      ${isActive
                        ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-200'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-green-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <TabIcon className="h-6 w-6" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <Outlet />
        </div>

        {/* Back Button */}
        <div className="px-6 pb-6">
          <button
            onClick={() => navigate({ to: '/parcels', search: { farmId: undefined } })}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <span>← Retour à la liste des parcelles</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/parcels/$parcelId')({
  component: ParcelLayout,
});

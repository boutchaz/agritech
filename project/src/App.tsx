import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DEFAULT_FARM_ID } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ModuleView from './components/ModuleView';
import Settings from './components/Settings';
import SoilAnalysisPage from './components/SoilAnalysisPage';
import StockManagement from './components/StockManagement';
import InfrastructureManagement from './components/InfrastructureManagement';
import EmployeeManagement from './components/EmployeeManagement';
import DayLaborerManagement from './components/DayLaborerManagement';
import UtilitiesManagement from './components/UtilitiesManagement';
import Reports from './components/Reports';
import FarmSwitcher from './components/FarmSwitcher';
import Map from './components/Map';
import type { Module, SensorData, DashboardSettings } from './types';

const mockModules: Module[] = [
  // Agriculture
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true, // Always active by default
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
  {
    id: 'mushrooms',
    name: 'Myciculture',
    icon: 'Sprout',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Gérez votre production de champignons',
    metrics: [
      { name: 'Humidité', value: 85, unit: '%', trend: 'stable' },
      { name: 'Production', value: 45, unit: 'kg/sem', trend: 'up' }
    ]
  },
  {
    id: 'greenhouse',
    name: 'Serres',
    icon: 'Home',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Contrôlez vos cultures sous serre',
    metrics: [
      { name: 'Température', value: 23.5, unit: '°C', trend: 'stable' },
      { name: 'Hygrométrie', value: 75, unit: '%', trend: 'down' }
    ]
  },
  {
    id: 'hydroponics',
    name: 'Hydroponie',
    icon: 'Droplets',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Gérez vos cultures hydroponiques',
    metrics: [
      { name: 'pH Solution', value: 6.2, unit: 'pH', trend: 'stable' },
      { name: 'EC', value: 1.8, unit: 'mS/cm', trend: 'up' }
    ]
  },
  {
    id: 'market-gardening',
    name: 'Maraîchage',
    icon: 'Flower2',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Gérez vos cultures maraîchères',
    metrics: [
      { name: 'Surface cultivée', value: 2.5, unit: 'ha', trend: 'stable' },
      { name: 'Rendement', value: 25, unit: 't/ha', trend: 'up' }
    ]
  },
  {
    id: 'aquaculture',
    name: 'Pisciculture',
    icon: 'Fish',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Surveillez vos installations piscicoles',
    metrics: [
      { name: 'Biomasse', value: 2.8, unit: 't', trend: 'up' },
      { name: 'Oxygène dissous', value: 7.2, unit: 'mg/L', trend: 'stable' }
    ]
  },
  {
    id: 'beekeeping',
    name: 'Apiculture',
    icon: 'Bug',
    active: false, // Inactive by default
    category: 'agriculture',
    description: 'Gérez vos ruches',
    metrics: [
      { name: 'Production miel', value: 25, unit: 'kg/ruche', trend: 'up' },
      { name: 'Colonies', value: 50, unit: 'ruches', trend: 'stable' }
    ]
  },

  // Élevage
  {
    id: 'cattle',
    name: 'Élevage Bovin',
    icon: 'Beef',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre troupeau de bovins',
    metrics: [
      { name: 'Effectif', value: 120, unit: 'têtes', trend: 'stable' },
      { name: 'Production lait', value: 25, unit: 'L/jour/vache', trend: 'up' }
    ]
  },
  {
    id: 'camel',
    name: 'Élevage Camelin',
    icon: 'Camel',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre troupeau de camélidés',
    metrics: [
      { name: 'Effectif', value: 45, unit: 'têtes', trend: 'up' },
      { name: 'Production lait', value: 8, unit: 'L/jour/chamelle', trend: 'stable' }
    ]
  },
  {
    id: 'goat',
    name: 'Élevage Caprin',
    icon: 'Sheep',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre troupeau de chèvres',
    metrics: [
      { name: 'Effectif', value: 200, unit: 'têtes', trend: 'stable' },
      { name: 'Production lait', value: 3.5, unit: 'L/jour/chèvre', trend: 'up' }
    ]
  },
  {
    id: 'laying-hens',
    name: 'Poules Pondeuses',
    icon: 'Bird',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre élevage de poules pondeuses',
    metrics: [
      { name: 'Effectif', value: 2500, unit: 'unités', trend: 'stable' },
      { name: 'Production œufs', value: 2100, unit: 'unités/j', trend: 'up' }
    ]
  },
  {
    id: 'chicks',
    name: 'Élevage Poussins',
    icon: 'Bird',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre élevage de poussins',
    metrics: [
      { name: 'Effectif', value: 1000, unit: 'unités', trend: 'up' },
      { name: 'Taux survie', value: 95, unit: '%', trend: 'stable' }
    ]
  },
  {
    id: 'broilers',
    name: 'Engraissement Volailles',
    icon: 'Bird',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez votre engraissement de volailles',
    metrics: [
      { name: 'Effectif', value: 3000, unit: 'unités', trend: 'stable' },
      { name: 'Poids moyen', value: 2.1, unit: 'kg', trend: 'up' }
    ]
  },
  {
    id: 'incubator',
    name: 'Couveuses',
    icon: 'Egg',
    active: false, // Inactive by default
    category: 'elevage',
    description: 'Gérez vos couveuses d\'œufs fécondés',
    metrics: [
      { name: 'Œufs en incubation', value: 1200, unit: 'unités', trend: 'stable' },
      { name: 'Taux d\'éclosion', value: 92, unit: '%', trend: 'up' },
      { name: 'Température moyenne', value: 37.8, unit: '°C', trend: 'stable' },
      { name: 'Humidité relative', value: 65, unit: '%', trend: 'stable' }
    ]
  }
];

const mockSensorData: SensorData[] = [
  {
    id: '1',
    type: 'moisture',
    value: 68,
    unit: '%',
    timestamp: new Date(),
    location: 'Parcelle A'
  }
];

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, setModules] = useState(mockModules);
  const [currentFarmId, setCurrentFarmId] = useState(DEFAULT_FARM_ID);
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    showSoilData: true,
    showClimateData: true,
    showIrrigationData: true,
    showMaintenanceData: true,
    showProductionData: true,
    showFinancialData: true,
    showStockAlerts: true,
    showTaskAlerts: true,
    layout: {
      topRow: ['soil', 'climate', 'irrigation', 'maintenance'],
      middleRow: ['production', 'financial'],
      bottomRow: ['alerts', 'tasks']
    }
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleModuleToggle = (moduleId: string) => {
    setModules(prevModules =>
      prevModules.map(module =>
        module.id === moduleId
          ? { ...module, active: !module.active }
          : module
      )
    );
  };

  const selectedModule = activeModule === 'dashboard' ? null : modules.find(m => m.id === activeModule);

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end">
          <FarmSwitcher
            currentFarmId={currentFarmId}
            onFarmChange={setCurrentFarmId}
          />
        </div>
        <Routes>
          <Route path="/" element={<Dashboard sensorData={mockSensorData} settings={dashboardSettings} />} />
          <Route path="/dashboard" element={<Dashboard sensorData={mockSensorData} settings={dashboardSettings} />} />
          <Route path="/settings" element={
            <Settings 
              modules={modules} 
              onModuleToggle={handleModuleToggle}
              dashboardSettings={dashboardSettings}
              onDashboardSettingsChange={setDashboardSettings}
            />
          } />
          <Route path="/soil-analysis" element={<SoilAnalysisPage />} />
          <Route path="/parcels" element={
            <div className="p-6 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Gestion des Parcelles
              </h2>
              <Map
                center={[31.7917, -7.0926]}
                zones={[]}
                sensors={mockSensorData}
                cropId="fruit-trees"
              />
            </div>
          } />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/infrastructure" element={<InfrastructureManagement />} />
          <Route path="/employees" element={<EmployeeManagement />} />
          <Route path="/day-laborers" element={<DayLaborerManagement />} />
          <Route path="/utilities" element={<UtilitiesManagement />} />
          <Route path="/reports" element={<Reports activeModules={modules.filter(m => m.active)} />} />
          {modules.filter(m => m.active).map(module => (
            <Route
              key={module.id}
              path={`/${module.id}`}
              element={<ModuleView module={module} sensorData={mockSensorData} />}
            />
          ))}
        </Routes>
      </main>
    </div>
  );
}

export default App;
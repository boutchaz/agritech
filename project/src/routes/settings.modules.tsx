import { createFileRoute } from '@tanstack/react-router'
import ModulesSettings from '../components/ModulesSettings'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import { useState } from 'react'
import type { Module } from '../types'

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers et optimisez votre production fruitière',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' },
      { name: 'Parcelles', value: 3, unit: 'ha', trend: 'stable' },
      { name: 'Santé', value: 85, unit: '%', trend: 'up' }
    ]
  },
  {
    id: 'cereals',
    name: 'Céréales',
    icon: 'Wheat',
    active: true,
    category: 'agriculture',
    description: 'Gestion des cultures céréalières',
    metrics: [
      { name: 'Surface', value: 45, unit: 'ha', trend: 'stable' },
      { name: 'Rendement', value: 8.2, unit: 't/ha', trend: 'up' }
    ]
  },
  {
    id: 'vegetables',
    name: 'Légumes',
    icon: 'Carrot',
    active: true,
    category: 'agriculture',
    description: 'Production de légumes de saison',
    metrics: [
      { name: 'Diversité', value: 12, unit: 'variétés', trend: 'up' },
      { name: 'Production', value: 25, unit: 't/ha', trend: 'stable' }
    ]
  },
  {
    id: 'mushrooms',
    name: 'Myciculture',
    icon: 'Sprout',
    active: false,
    category: 'agriculture',
    description: 'Gérez votre production de champignons',
    metrics: [
      { name: 'Humidité', value: 85, unit: '%', trend: 'stable' },
      { name: 'Production', value: 45, unit: 'kg/sem', trend: 'up' }
    ]
  },
  {
    id: 'livestock',
    name: 'Élevage',
    icon: 'Cow',
    active: false,
    category: 'elevage',
    description: 'Gestion du cheptel et alimentation',
    metrics: [
      { name: 'Têtes', value: 120, unit: 'animaux', trend: 'stable' },
      { name: 'Production', value: 850, unit: 'L/jour', trend: 'up' }
    ]
  }
];

const ModulesSettingsPage = () => {
  const [modules, setModules] = useState(mockModules);

  const handleModuleToggle = (moduleId: string) => {
    setModules(prev => prev.map(module =>
      module.id === moduleId
        ? { ...module, active: !module.active }
        : module
    ));
  };

  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <ModulesSettings
        modules={modules}
        onModuleToggle={handleModuleToggle}
      />
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute('/settings/modules')({
  component: ModulesSettingsPage,
})
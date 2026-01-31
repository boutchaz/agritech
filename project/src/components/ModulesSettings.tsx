import React, { useState } from 'react';
import { Check, X, Boxes, Lock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import TreeManagement from './TreeManagement';
import { useSubscription } from '../hooks/useSubscription';
import { useModules, useUpdateModule } from '../hooks/useModules';
import { isModuleAvailable, getPlanDetails } from '../lib/polar';
import { useNavigate } from '@tanstack/react-router';
import type { OrganizationModule } from '../lib/api/modules';

// Database module categories (must match the database categories)
const MODULE_CATEGORIES = {
  CORE: 'core',
  PRODUCTION: 'production',
  OPERATIONS: 'operations',
  HR: 'hr',
  INVENTORY: 'inventory',
  SALES: 'sales',
  PURCHASING: 'purchasing',
  ACCOUNTING: 'accounting',
  ANALYTICS: 'analytics',
} as const;

// Category display names in French (app language)
const CATEGORY_LABELS_FR: Record<string, string> = {
  [MODULE_CATEGORIES.CORE]: 'Module Core',
  [MODULE_CATEGORIES.PRODUCTION]: 'Production',
  [MODULE_CATEGORIES.OPERATIONS]: 'Opérations',
  [MODULE_CATEGORIES.HR]: 'Ressources Humaines',
  [MODULE_CATEGORIES.INVENTORY]: 'Inventaire & Stock',
  [MODULE_CATEGORIES.SALES]: 'Ventes',
  [MODULE_CATEGORIES.PURCHASING]: 'Approvisionnement',
  [MODULE_CATEGORIES.ACCOUNTING]: 'Comptabilité',
  [MODULE_CATEGORIES.ANALYTICS]: 'Analytique',
};

const ModulesSettings: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<OrganizationModule | null>(null);
  const { data: subscription } = useSubscription();
  const { data: modules = [], isLoading, error } = useModules();
  const updateModule = useUpdateModule();
  const navigate = useNavigate();

  // Group modules by their database category
  const coreModules = modules.filter(m => m.category === MODULE_CATEGORIES.CORE);
  const productionModules = modules.filter(m => m.category === MODULE_CATEGORIES.PRODUCTION);
  const operationsModules = modules.filter(m => m.category === MODULE_CATEGORIES.OPERATIONS);
  const hrModules = modules.filter(m => m.category === MODULE_CATEGORIES.HR);
  const inventoryModules = modules.filter(m => m.category === MODULE_CATEGORIES.INVENTORY);
  const salesModules = modules.filter(m => m.category === MODULE_CATEGORIES.SALES);
  const purchasingModules = modules.filter(m => m.category === MODULE_CATEGORIES.PURCHASING);
  const accountingModules = modules.filter(m => m.category === MODULE_CATEGORIES.ACCOUNTING);
  const analyticsModules = modules.filter(m => m.category === MODULE_CATEGORIES.ANALYTICS);

  const handleModuleToggle = async (moduleId: string, currentActive: boolean) => {
    // If trying to activate a module
    if (!currentActive) {
      // Check if module is available in current plan
      if (!isModuleAvailable(subscription, moduleId)) {
        // Show upgrade prompt
        if (confirm('Ce module n\'est pas disponible dans votre plan actuel. Voulez-vous voir les options de mise à niveau?')) {
          navigate({ to: '/settings/subscription' });
        }
        return;
      }
    }

    // Proceed with toggle
    try {
      await updateModule.mutateAsync({
        moduleId,
        data: { is_active: !currentActive },
      });
    } catch (error) {
      console.error('Error toggling module:', error);
    }
  };

  const renderModuleList = (modulesList: OrganizationModule[], categoryLabel: string) => {
    if (modulesList.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {categoryLabel}
        </h3>
        <div className="space-y-3">
          {modulesList.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              subscription={subscription}
              onToggle={handleModuleToggle}
              onClick={() => setSelectedModule(module)}
            />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des modules. Veuillez réessayer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Boxes className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Modules
        </h2>
      </div>

      <p className="text-gray-600 dark:text-gray-400">
        Activez ou désactivez les modules selon vos besoins. Les modules désactivés n'apparaîtront pas dans la navigation.
      </p>

      {subscription && subscription.plan_type && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Plan actuel: {getPlanDetails(subscription.plan_type).name}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {getPlanDetails(subscription.plan_type).availableModules.includes('*')
                ? 'Tous les modules sont disponibles'
                : `${getPlanDetails(subscription.plan_type).availableModules.length} modules disponibles`}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>Voir l'abonnement</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Module Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderModuleList(coreModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.CORE])}
        {renderModuleList(productionModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.PRODUCTION])}
        {renderModuleList(operationsModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.OPERATIONS])}
        {renderModuleList(hrModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.HR])}
        {renderModuleList(inventoryModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.INVENTORY])}
        {renderModuleList(salesModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.SALES])}
        {renderModuleList(purchasingModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.PURCHASING])}
        {renderModuleList(accountingModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.ACCOUNTING])}
        {renderModuleList(analyticsModules, CATEGORY_LABELS_FR[MODULE_CATEGORIES.ANALYTICS])}
      </div>

      {/* Module Settings */}
      {selectedModule && (
        <ModuleSettingsPanel
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}
    </div>
  );
};

// Extracted Module Card component for reusability
const ModuleCard: React.FC<{
  module: OrganizationModule;
  subscription: any;
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onClick: () => void;
}> = ({ module, subscription, onToggle, onClick }) => {
  const moduleAvailable = isModuleAvailable(subscription, module.id);
  const isLocked = !moduleAvailable;

  return (
    <div
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
        isLocked ? 'opacity-60' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
      onClick={() => !isLocked && onClick()}
    >
      <div className="flex items-center space-x-3 flex-1">
        <input
          type="checkbox"
          checked={module.is_active}
          disabled={isLocked}
          onChange={() => onToggle(module.id, module.is_active)}
          className="rounded border-gray-300 disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{module.name}</span>
            {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
          {isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = '/settings/subscription';
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
            >
              Mettre à niveau pour débloquer →
            </button>
          )}
        </div>
      </div>
      {module.is_active ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : isLocked ? (
        <Lock className="h-5 w-5 text-gray-400" />
      ) : (
        <X className="h-5 w-5 text-gray-400" />
      )}
    </div>
  );
};

// Module Settings Panel
const ModuleSettingsPanel: React.FC<{
  module: OrganizationModule;
  onClose: () => void;
}> = ({ module, onClose }) => {
  const renderModuleSettings = () => {
    switch (module.id) {
      case 'farm_management':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Paramètres de Gestion de Ferme</h3>
              <TreeManagement />
            </div>
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Paramètres généraux</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span>Notifications de taille</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span>Alertes de maladies</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span>Prévisions de récolte</span>
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-gray-500 dark:text-gray-400">
            Aucun paramètre spécifique disponible pour ce module
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Configuration de {module.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {renderModuleSettings()}
    </div>
  );
};

export default ModulesSettings;
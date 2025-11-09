import React, { useState } from 'react';
import { Check, X, Boxes, Lock, ExternalLink } from 'lucide-react';
import type { Module } from '../types';
import TreeManagement from './TreeManagement';
import { useSubscription } from '../hooks/useSubscription';
import { isModuleAvailable, getPlanDetails } from '../lib/polar';
import { useNavigate } from '@tanstack/react-router';

interface ModulesSettingsProps {
  modules?: Module[];
  onModuleToggle?: (moduleId: string) => void;
}

const ModulesSettings: React.FC<ModulesSettingsProps> = ({
  modules = [],
  onModuleToggle = () => {}
}) => {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();

  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');

  const handleModuleToggle = (moduleId: string, currentActive: boolean) => {
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
    onModuleToggle(moduleId);
  };

  const renderModuleSettings = (module: Module) => {
    switch (module.id) {
      case 'fruit-trees':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gestion des arbres fruitiers</h3>
              <TreeManagement />
            </div>

            <div className="border-t pt-4 mt-6">
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

            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Gestion des parcelles
              </h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Les parcelles peuvent être assignées directement dans le module pour une gestion personnalisée des données et recommandations.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    <span className="text-sm">Auto-détecter les parcelles avec arbres fruitiers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    <span className="text-sm">Suggestions basées sur le type de sol</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-sm">Assignment automatique des nouvelles parcelles</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Intégrations
              </h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span className="text-sm">Synchroniser avec l'analyse du sol</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span className="text-sm">Utiliser les données satellite</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-sm">Connecter aux capteurs IoT</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Modules Agriculture
          </h3>
          <div className="space-y-3">
            {agricultureModules.map((module) => {
              const moduleAvailable = isModuleAvailable(subscription, module.id);
              const isLocked = !moduleAvailable;

              return (
                <div
                  key={module.id}
                  className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                    isLocked ? 'opacity-60' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => !isLocked && setSelectedModule(module)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={module.active}
                      disabled={isLocked}
                      onChange={() => handleModuleToggle(module.id, module.active)}
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
                            navigate({ to: '/settings/subscription' });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                        >
                          Mettre à niveau pour débloquer →
                        </button>
                      )}
                    </div>
                  </div>
                  {module.active ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : isLocked ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Modules Élevage
          </h3>
          <div className="space-y-3">
            {elevageModules.map((module) => {
              const moduleAvailable = isModuleAvailable(subscription, module.id);
              const isLocked = !moduleAvailable;

              return (
                <div
                  key={module.id}
                  className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                    isLocked ? 'opacity-60' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => !isLocked && setSelectedModule(module)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={module.active}
                      disabled={isLocked}
                      onChange={() => handleModuleToggle(module.id, module.active)}
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
                            navigate({ to: '/settings/subscription' });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                        >
                          Mettre à niveau pour débloquer →
                        </button>
                      )}
                    </div>
                  </div>
                  {module.active ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : isLocked ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module Settings */}
      {selectedModule && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configuration de {selectedModule.name}
            </h3>
            <button
              onClick={() => setSelectedModule(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {renderModuleSettings(selectedModule)}
        </div>
      )}
    </div>
  );
};

export default ModulesSettings;
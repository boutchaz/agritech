import React, { useState } from 'react';
import {
  Check, X, Boxes, Lock, ExternalLink, Loader2, AlertCircle,
  TreeDeciduous, Droplets, Waves, Sprout, Flower2, Fish,
  Bird, ChevronDown, ChevronRight, Wheat,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import TreeManagement from './TreeManagement';
import { useSubscription } from '../hooks/useSubscription';
import { useModules, useUpdateModule } from '../hooks/useModules';
import { isModuleAvailableForPlan, getPlanDetails } from '../lib/polar';
import { useNavigate } from '@tanstack/react-router';
import type { OrganizationModule } from '../lib/api/modules';

// ============================================================================
// Display names for activity modules (DB stores snake_case names)
// ============================================================================
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  arbres_fruitiers: 'Arbres fruitiers',
  aeroponie: 'Aéroponie',
  hydroponie: 'Hydroponie',
  maraichage: 'Maraîchage',
  myciculture: 'Myciculture',
  pisciculture: 'Pisciculture',
  bovin: 'Bovin',
  ovin: 'Ovin',
  camelin: 'Camelin',
  caprin: 'Caprin',
  aviculture: 'Aviculture',
  couveuses: 'Couveuses',
};

// Icon mapping for activity modules
const MODULE_ICONS: Record<string, LucideIcon> = {
  arbres_fruitiers: TreeDeciduous,
  aeroponie: Droplets,
  hydroponie: Waves,
  maraichage: Sprout,
  myciculture: Flower2,
  pisciculture: Fish,
  bovin: Boxes,
  ovin: Boxes,
  camelin: Boxes,
  caprin: Boxes,
  aviculture: Bird,
  couveuses: Bird,
};

// Descriptions for modules
const MODULE_DESCRIPTIONS: Record<string, string> = {
  arbres_fruitiers: 'Pommiers, agrumes, grenadiers, avocatiers...',
  aeroponie: 'Culture aéroponique sans sol',
  hydroponie: 'Culture hydroponique en milieu aqueux',
  maraichage: 'Cultures légumières et maraîchères',
  myciculture: 'Culture de champignons',
  pisciculture: 'Élevage de poissons',
  bovin: 'Élevage de bovins',
  ovin: 'Élevage de moutons',
  camelin: 'Élevage de camelins',
  caprin: 'Élevage de caprins',
  aviculture: 'Élevage de volailles',
  couveuses: 'Poussins, poulet de chair, poules pondeuses',
};

// Category display names for functional modules
const FUNCTIONAL_CATEGORY_LABELS: Record<string, string> = {
  core: 'Module Core',
  production: 'Production',
  operations: 'Opérations',
  hr: 'Ressources Humaines',
  inventory: 'Inventaire & Stock',
  sales: 'Ventes',
  purchasing: 'Approvisionnement',
  accounting: 'Comptabilité',
  analytics: 'Analytique',
};

// ============================================================================
// Main component
// ============================================================================
const ModulesSettings: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<OrganizationModule | null>(null);
  const [showFunctional, setShowFunctional] = useState(false);
  const { data: subscription } = useSubscription();
  const { data: modules = [], isLoading, error } = useModules();
  const updateModule = useUpdateModule();
  const navigate = useNavigate();

  // Separate agriculture, élevage, and functional modules
  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');
  const functionalModules = modules.filter(
    m => m.category !== 'agriculture' && m.category !== 'elevage'
  );

  // Group functional modules by category
  const functionalByCategory = functionalModules.reduce<Record<string, OrganizationModule[]>>(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {}
  );

  const handleModuleToggle = async (moduleId: string, currentActive: boolean) => {
    if (!currentActive) {
      const moduleRecord = modules.find((item) => item.id === moduleId);
      if (!moduleRecord || !isModuleAvailableForPlan(moduleRecord, subscription)) {
        if (confirm('Ce module n\'est pas disponible dans votre plan actuel. Voulez-vous voir les options de mise à niveau?')) {
          navigate({ to: '/settings/subscription' });
        }
        return;
      }
    }

    try {
      await updateModule.mutateAsync({
        moduleId,
        data: { is_active: !currentActive },
      });
    } catch (err) {
      console.error('Error toggling module:', err);
    }
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
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Boxes className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Modules
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Activez ou désactivez les modules selon vos besoins. Les modules désactivés n&apos;apparaîtront pas dans la navigation.
        </p>
      </div>

      {/* Subscription banner */}
      {subscription && (subscription.formula || subscription.plan_type) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Plan actuel: {getPlanDetails((subscription.formula || subscription.plan_type)!).name}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {getPlanDetails((subscription.formula || subscription.plan_type)!).availableModules.includes('*')
                ? 'Tous les modules sont disponibles'
                : `${getPlanDetails((subscription.formula || subscription.plan_type)!).availableModules.length} modules disponibles`}
            </p>
          </div>
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>Voir l&apos;abonnement</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* Agriculture Section */}
      {/* ================================================================ */}
      <CategorySection
        title="Agriculture"
        icon={Wheat}
        description="Modules de production agricole"
        accentColor="green"
        modules={agricultureModules}
        subscription={subscription}
        onToggle={handleModuleToggle}
        onModuleClick={setSelectedModule}
      />

      {/* ================================================================ */}
      {/* Élevage Section */}
      {/* ================================================================ */}
      <CategorySection
        title="Élevage"
        icon={Bird}
        description="Modules d'élevage et de gestion animale"
        accentColor="amber"
        modules={elevageModules}
        subscription={subscription}
        onToggle={handleModuleToggle}
        onModuleClick={setSelectedModule}
      />

      {/* ================================================================ */}
      {/* Functional Modules (collapsible) */}
      {/* ================================================================ */}
      {functionalModules.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFunctional(!showFunctional)}
            className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Settings2 className="h-5 w-5 text-gray-500" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Modules fonctionnels
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gestion, comptabilité, stock, RH, analytique...
                </p>
              </div>
            </div>
            {showFunctional ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showFunctional && (
            <div className="p-5 space-y-6 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(functionalByCategory).map(([category, categoryModules]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      {FUNCTIONAL_CATEGORY_LABELS[category] || category}
                    </h4>
                    <div className="space-y-2">
                      {categoryModules.map((module) => (
                        <ModuleToggleCard
                          key={module.id}
                          module={module}
                          subscription={subscription}
                          onToggle={handleModuleToggle}
                          onClick={() => setSelectedModule(module)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Module Settings Panel */}
      {selectedModule && (
        <ModuleSettingsPanel
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Category Section (Agriculture / Élevage)
// ============================================================================
const CategorySection: React.FC<{
  title: string;
  icon: LucideIcon;
  description: string;
  accentColor: 'green' | 'amber';
  modules: OrganizationModule[];
  subscription: any;
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onModuleClick: (module: OrganizationModule) => void;
}> = ({ title, icon: Icon, description, accentColor, modules, subscription, onToggle, onModuleClick }) => {
  const activeCount = modules.filter(m => m.is_active).length;

  const colorClasses = accentColor === 'green'
    ? {
      headerBg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      headerBorder: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconColor: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    }
    : {
      headerBg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
      headerBorder: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };

  return (
    <div className={`rounded-xl border ${colorClasses.headerBorder} overflow-hidden`}>
      {/* Section header */}
      <div className={`${colorClasses.headerBg} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${colorClasses.iconBg} rounded-lg flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${colorClasses.iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses.badge}`}>
            {activeCount}/{modules.length} actifs
          </span>
        </div>
      </div>

      {/* Modules grid */}
      <div className="p-5 bg-white dark:bg-gray-800">
        {modules.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            Aucun module disponible dans cette catégorie.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((module) => (
              <ActivityModuleCard
                key={module.id}
                module={module}
                subscription={subscription}
                accentColor={accentColor}
                onToggle={onToggle}
                onClick={() => onModuleClick(module)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Activity Module Card (Agriculture / Élevage modules)
// ============================================================================
const ActivityModuleCard: React.FC<{
  module: OrganizationModule;
  subscription: any;
  accentColor: 'green' | 'amber';
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onClick: () => void;
}> = ({ module, subscription, accentColor, onToggle, onClick }) => {
  const moduleAvailable = isModuleAvailableForPlan(module, subscription);
  const isLocked = !moduleAvailable;
  const Icon = MODULE_ICONS[module.name] || Boxes;
  const displayName = MODULE_DISPLAY_NAMES[module.name] || module.name;
  const displayDesc = MODULE_DESCRIPTIONS[module.name] || module.description;

  const activeClasses = accentColor === 'green'
    ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10'
    : 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10';

  const inactiveClasses = 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all ${
        isLocked
          ? 'opacity-60 border-gray-200 dark:border-gray-700'
          : module.is_active
            ? activeClasses
            : `${inactiveClasses} cursor-pointer`
      }`}
      onClick={() => !isLocked && onClick()}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${
            module.is_active
              ? accentColor === 'green'
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
              : 'text-gray-400'
          }`} />
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            {displayName}
          </h4>
        </div>

        {isLocked ? (
          <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(module.id, module.is_active);
            }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              module.is_active
                ? accentColor === 'green'
                  ? 'bg-green-500'
                  : 'bg-amber-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                module.is_active ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {displayDesc}
      </p>

      {isLocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = '/settings/subscription';
          }}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
        >
          Mettre à niveau →
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Functional Module Toggle Card (simpler, for the collapsible section)
// ============================================================================
const ModuleToggleCard: React.FC<{
  module: OrganizationModule;
  subscription: any;
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onClick: () => void;
}> = ({ module, subscription, onToggle, onClick }) => {
  const moduleAvailable = isModuleAvailableForPlan(module, subscription);
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
            <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">{module.name}</span>
            {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{module.description}</p>
        </div>
      </div>
      {module.is_active ? (
        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : isLocked ? (
        <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-gray-400 flex-shrink-0" />
      )}
    </div>
  );
};

// ============================================================================
// Module Settings Panel
// ============================================================================
const ModuleSettingsPanel: React.FC<{
  module: OrganizationModule;
  onClose: () => void;
}> = ({ module, onClose }) => {
  const renderModuleSettings = () => {
    switch (module.name) {
      case 'arbres_fruitiers':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Gestion des types d&apos;arbres
              </h3>
              <TreeManagement />
            </div>
          </div>
        );
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

  const displayName = MODULE_DISPLAY_NAMES[module.name] || module.name;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Configuration de {displayName}
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

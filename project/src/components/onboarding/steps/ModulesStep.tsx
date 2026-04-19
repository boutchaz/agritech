
import {
  MapPin,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Building,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Truck,
  Receipt,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { ModuleCard } from '../ui/ModuleCard';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { ButtonLoader, SectionLoader } from '@/components/ui/loader';
import {
  isModuleAvailableForPlan,
  normalizePlanType,
  type PlanType,
} from '@/lib/polar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

// Icon mapping from database icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  Users,
  Satellite: TrendingUp,
  ShieldCheck,
  Building,
  BarChart3,
};

interface ModuleSelection {
  farm_management: boolean;
  inventory: boolean;
  sales: boolean;
  procurement: boolean;
  accounting: boolean;
  hr: boolean;
  analytics: boolean;
  marketplace: boolean;
  compliance: boolean;
}

interface ModulesStepProps {
  moduleSelection: ModuleSelection;
  selectedPlanType?: PlanType | null;
  onUpdate: (data: Partial<ModuleSelection>) => void;
  onNext: () => void;
  isLoading?: boolean;
}

const getColorFromName = (colorName: string): string => {
  // Map database color names to Tailwind color classes
  const colorMap: Record<string, string> = {
    emerald: 'emerald',
    blue: 'blue',
    purple: 'purple',
    orange: 'orange',
    indigo: 'indigo',
    pink: 'pink',
    cyan: 'cyan',
    green: 'green',
    violet: 'violet',
  };
  return colorMap[colorName] || 'gray';
};

export const ModulesStep = ({
  moduleSelection,
  selectedPlanType,
  onUpdate,
  onNext,
  isLoading: isSubmitting = false,
}: ModulesStepProps) => {
  const { t } = useTranslation();
  const { data: config, isLoading: isLoadingConfig, error } = useModuleConfig();
  const modules = config?.modules || [];

  const getRequiredPlan = (requiredPlan?: string | null): PlanType | null => {
    if (!requiredPlan) {
      return null;
    }

    return normalizePlanType(requiredPlan as PlanType);
  };

  const isModuleAvailable = (requiredPlan?: string | null) => {
    const normalizedRequiredPlan = getRequiredPlan(requiredPlan);

    if (!normalizedRequiredPlan || !selectedPlanType) {
      return true;
    }

    return isModuleAvailableForPlan(
      { required_plan: normalizedRequiredPlan },
      { plan_type: selectedPlanType }
    );
  };

  const availableModules = modules.filter((module) => isModuleAvailable(module.requiredPlan));
  const availableModuleSlugs = new Set(availableModules.map((module) => module.slug));
  const selectedCount = Object.entries(moduleSelection).filter(
    ([slug, isSelected]) => isSelected && availableModuleSlugs.has(slug)
  ).length;

  const toggleModule = (moduleId: string) => {
    onUpdate({ [moduleId]: !moduleSelection[moduleId as keyof ModuleSelection] });
  };

  // Encouraging messages based on selection count
  const getMessage = () => {
    if (selectedCount === 0) return 'Sélectionnez au moins un module pour commencer';
    if (selectedCount === 1) return 'Bon début ! Ajoutez-en d\'autres pour plus de puissance';
    if (selectedCount <= 3) return 'Excellent choix ! Votre ferme prend forme';
    if (selectedCount <= 5) return 'Impressionnant ! Vous êtes prêt à tout gérer';
    return 'Configuration complète ! Vous êtes un pro';
  };

  if (isSubmitting) {
    return (
      <SectionLoader className="h-64" />
    );
  }

  if (isLoadingConfig) {
    return (
      <SectionLoader className="h-64" />
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm text-red-800">
          {t('modulesStep.loadError')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choisissez vos super-pouvoirs
        </h2>
        <p className="text-gray-500">
          Activez les modules dont vous avez besoin
        </p>
      </div>

      {/* Selection counter */}
      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl border border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">{getMessage()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">{selectedCount}</span>
            <span className="text-sm text-gray-500">/ {availableModules.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 rounded-full"
            style={{
              width: `${
                availableModules.length === 0
                  ? 0
                  : (selectedCount / availableModules.length) * 100
              }%`
            }}
          />
        </div>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((module) => {
          const IconComponent = ICON_MAP[module.icon] || Package;
          const isAvailable = isModuleAvailable(module.requiredPlan);

          return (
            <ModuleCard
              key={module.slug}
              id={module.slug}
              name={module.name}
              description={module.description}
              icon={<IconComponent className="w-5 h-5" />}
              color={getColorFromName(module.color)}
              selected={moduleSelection[module.slug as keyof ModuleSelection] || false}
              onToggle={() => {
                if (!isAvailable) {
                  return;
                }
                toggleModule(module.slug);
              }}
              recommended={module.isRecommended}
              locked={!isAvailable}
              requiredPlan={module.requiredPlan}
            />
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3 justify-center">
        <Button
          type="button"
          onClick={() => {
            const allSelected: Partial<ModuleSelection> = {};
            availableModules.forEach(m => {
              allSelected[m.slug as keyof ModuleSelection] = true;
            });
            onUpdate(allSelected);
          }}
          className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          Tout sélectionner
        </Button>
        <Button
          type="button"
          onClick={() => {
            const recommended: Partial<ModuleSelection> = {};
            availableModules.forEach(m => {
              recommended[m.slug as keyof ModuleSelection] = m.isRecommended;
            });
            onUpdate(recommended);
          }}
          className="px-4 py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
        >
          Sélection recommandée
        </Button>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>Pas de panique !</strong> Vous pourrez activer ou désactiver ces modules à tout moment depuis les paramètres.
        </p>
      </div>

      <Button
        type="button"
        onClick={onNext}
        disabled={selectedCount === 0 || isSubmitting}
        className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
          shadow-lg shadow-emerald-500/30 hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300 hover:scale-[1.02]
          flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <ButtonLoader className="h-5 w-5 text-white" />
            <span>Enregistrement...</span>
          </>
        ) : (
          <>
            Dernière étape
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ModulesStep;

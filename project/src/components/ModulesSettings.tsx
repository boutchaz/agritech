import {  useState  } from "react";
import {
  Check, X, Boxes, Lock, ExternalLink, Loader2, AlertCircle,
  TreeDeciduous, Droplets, Waves, Sprout, Flower2, Fish,
  Bird, ChevronDown, ChevronRight, Wheat,
  Settings2, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import TreeManagement from './TreeManagement';
import { useSubscription } from '../hooks/useSubscription';
import { useModules, useUpdateModule } from '../hooks/useModules';
import { isModuleAvailableForPlan, getPlanDetails } from '../lib/polar';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { OrganizationModule } from '../lib/api/modules';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

// ============================================================================
// Main component
// ============================================================================
const ModulesSettings = () => {
  const { t } = useTranslation();

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
        if (confirm(t('modulesSettings.upgradePrompt'))) {
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
      <div className="min-w-0">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600 dark:text-red-400">
            {t('modulesSettings.error')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">
              {t('modulesSettings.title')}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('modulesSettings.subtitle')}
          </p>
        </div>
      </div>

      {/* Subscription banner */}
      {subscription && (subscription.formula || subscription.plan_type) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-inner">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">Subscription Power</p>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight uppercase mt-1">
                {t('modulesSettings.currentPlan', { plan: getPlanDetails((subscription.formula || subscription.plan_type)!).name })}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {getPlanDetails((subscription.formula || subscription.plan_type)!).availableModules.includes('*')
                  ? t('modulesSettings.allModulesAvailable')
                  : t('modulesSettings.modulesAvailable', { count: getPlanDetails((subscription.formula || subscription.plan_type)!).availableModules.length })}
              </p>
            </div>
          </div>
          <Button 
            variant="default"
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none transition-all"
          >
            <span>{t('modulesSettings.viewSubscription')}</span>
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ================================================================ */}
      {/* Agriculture Section */}
      {/* ================================================================ */}
      <CategorySection
        title={t('modulesSettings.sections.agriculture')}
        icon={Wheat}
        description={t('modulesSettings.sections.agricultureDesc')}
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
        title={t('modulesSettings.sections.elevage')}
        icon={Bird}
        description={t('modulesSettings.sections.elevageDesc')}
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
        <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group">
          <button
            onClick={() => setShowFunctional(!showFunctional)}
            className="w-full flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all border-b border-transparent data-[state=open]:border-slate-100"
            data-state={showFunctional ? 'open' : 'closed'}
          >
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500">
                <Settings2 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-left space-y-1">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('modulesSettings.sections.functional')}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('modulesSettings.sections.functionalDesc')}
                </p>
              </div>
            </div>
            <div className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
              {showFunctional ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </button>

          {showFunctional && (
            <CardContent className="p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {Object.entries(functionalByCategory).map(([category, categoryModules]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3 px-1 mb-6">
                      <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        {t(`modulesSettings.categories.${category}`, category)}
                      </h4>
                      <div className="h-px flex-1 bg-slate-50 dark:bg-slate-800" />
                    </div>
                    <div className="space-y-3">
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
            </CardContent>
          )}
        </Card>
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
const CategorySection = ({ title, icon: Icon, description, accentColor, modules, subscription, onToggle, onModuleClick }: { title: string;
  icon: LucideIcon;
  description: string;
  accentColor: 'green' | 'amber';
  modules: OrganizationModule[];
  subscription: unknown;
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onModuleClick: (module: OrganizationModule) => void; }) => {
  const { t } = useTranslation();
  const activeCount = modules.filter(m => m.is_active).length;

  const colorClasses = accentColor === 'green'
    ? {
      headerBg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
      headerBorder: 'border-emerald-100 dark:border-emerald-800/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none',
    }
    : {
      headerBg: 'bg-amber-50/50 dark:bg-amber-900/10',
      headerBorder: 'border-amber-100 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500 text-white shadow-lg shadow-amber-100 dark:shadow-none',
    };

  return (
    <Card className={cn("rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group", colorClasses.headerBorder)}>
      {/* Section header */}
      <div className={cn("p-8 border-b transition-colors", colorClasses.headerBg, colorClasses.headerBorder)}>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={cn("p-3 rounded-2xl shadow-sm border group-hover:scale-110 transition-transform duration-500", colorClasses.iconBg, colorClasses.headerBorder)}>
              <Icon className={cn("h-6 w-6", colorClasses.iconColor)} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <Badge className={cn("border-none font-semibold text-[10px] tracking-widest px-4 py-1.5 rounded-xl uppercase", colorClasses.badge)}>
            {activeCount} / {modules.length} {t('liveDashboard.operations.active').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Modules grid */}
      <CardContent className="p-8 bg-white dark:bg-slate-800">
        {modules.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-center py-12 font-semibold text-[10px] uppercase tracking-[0.2em]">
            {t('modulesSettings.noModulesInCategory')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Activity Module Card (Agriculture / Élevage modules)
// ============================================================================
const ActivityModuleCard = ({ module, subscription, accentColor, onToggle, onClick }: { module: OrganizationModule;
  subscription: unknown;
  accentColor: 'green' | 'amber';
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onClick: () => void; }) => {
  const { t } = useTranslation();
  const moduleAvailable = isModuleAvailableForPlan(module, subscription);
  const isLocked = !moduleAvailable;
  const Icon = MODULE_ICONS[module.name] || Boxes;
  const displayName = t(`modulesSettings.activityModules.${module.name}`, module.name);
  const displayDesc = t(`modulesSettings.activityDescriptions.${module.name}`, module.description);

  const activeClasses = accentColor === 'green'
    ? 'border-emerald-500 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-500/10'
    : 'border-amber-500 bg-white dark:bg-slate-900 shadow-xl shadow-amber-500/10';

  const inactiveClasses = 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900';

  return (
    <div
      className={cn(
        "relative rounded-3xl border-2 p-6 transition-all duration-500 group/card cursor-pointer flex flex-col h-full",
        isLocked ? "opacity-60 border-slate-100 dark:border-slate-800 bg-slate-50/30 grayscale" : module.is_active ? activeClasses : inactiveClasses
      )}
      onClick={() => !isLocked && onClick()}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2.5 rounded-xl transition-all duration-500 group-hover/card:scale-110",
            module.is_active 
              ? accentColor === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 shadow-sm'
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-tight truncate">
            {displayName}
          </h4>
        </div>

        {isLocked ? (
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(module.id, module.is_active);
            }}
            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none ring-offset-white dark:ring-offset-slate-900"
          >
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              module.is_active ? accentColor === 'green' ? 'bg-emerald-500' : 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
            )} />
            <span
              className={cn(
                "relative inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                module.is_active ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        )}
      </div>

      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-6">
        {displayDesc}
      </p>

      {isLocked ? (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = '/settings/subscription';
          }}
          variant="ghost"
          className="mt-auto w-full h-9 rounded-xl text-[10px] font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 transition-all"
        >
          {t('modulesSettings.upgrade')}
        </Button>
      ) : module.is_active && (
        <div className="mt-auto flex items-center gap-2 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          Module Operational
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Functional Module Toggle Card (simpler, for the collapsible section)
// ============================================================================
const ModuleToggleCard = ({ module, subscription, onToggle, onClick }: { module: OrganizationModule;
  subscription: unknown;
  onToggle: (moduleId: string, currentActive: boolean) => Promise<void>;
  onClick: () => void; }) => {
  const moduleAvailable = isModuleAvailableForPlan(module, subscription);
  const isLocked = !moduleAvailable;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group/row",
        isLocked ? 'opacity-60 bg-slate-50 dark:bg-slate-900/30 border-transparent grayscale' : 'cursor-pointer bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5'
      )}
      onClick={() => !isLocked && onClick()}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative flex items-center justify-center h-5 w-5 flex-shrink-0">
          <input
            type="checkbox"
            checked={module.is_active}
            disabled={isLocked}
            onChange={() => onToggle(module.id, module.is_active)}
            className="h-5 w-5 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-emerald-600 focus:ring-emerald-500/20 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
          {module.is_active && <Check className="absolute h-3 w-3 text-white pointer-events-none" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover/row:text-emerald-600 transition-colors">
              {module.name.replace('_', ' ')}
            </span>
            {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
          </div>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">{module.description}</p>
        </div>
      </div>
      
      <div className="ml-4">
        {module.is_active ? (
          <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none font-semibold text-[8px] tracking-widest px-2 py-0.5">ACTIVE</Badge>
        ) : isLocked ? (
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-semibold text-[8px] tracking-widest px-2 py-0.5">LOCKED</Badge>
        ) : (
          <Badge variant="outline" className="text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-700 font-semibold text-[8px] tracking-widest px-2 py-0.5">INACTIVE</Badge>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Module Settings Panel
// ============================================================================
const ModuleSettingsPanel = ({ module, onClose }: { module: OrganizationModule;
  onClose: () => void; }) => {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});

  const renderModuleSettings = () => {
    switch (module.name) {
      case 'arbres_fruitiers':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <TreeDeciduous className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('modulesSettings.treeManagement')}
                </h3>
              </div>
              <div className="p-1 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 shadow-inner overflow-hidden">
                <TreeManagement />
              </div>
            </div>
          </div>
        );
      case 'farm_management':
        return (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Wheat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">{t('modulesSettings.farmManagementSettings')}</h3>
              </div>
              <div className="p-1 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 shadow-inner overflow-hidden">
                <TreeManagement />
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                  <Settings2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">{t('modulesSettings.generalSettings')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'pruning', label: t('modulesSettings.pruningNotifications') },
                  { key: 'disease', label: t('modulesSettings.diseaseAlerts') },
                  { key: 'harvest', label: t('modulesSettings.harvestForecasts') },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 group hover:border-purple-200 transition-all">
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-widest">{item.label}</span>
                    <Checkbox defaultChecked className="h-5 w-5 rounded-lg data-[state=checked]:bg-purple-600 border-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="py-20 text-center space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full w-fit mx-auto border border-slate-100 dark:border-slate-800">
              <Settings2 className="h-10 w-10 text-slate-200 dark:text-slate-700" />
            </div>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              {t('modulesSettings.noSettings')}
            </p>
          </div>
        );
    }
  };

  const displayName = t(`modulesSettings.activityModules.${module.name}`, module.name);

  return (
    <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden mt-12 animate-in slide-in-from-bottom-8 duration-700">
      <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <Settings2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                {t('modulesSettings.configurationOf', { name: displayName })}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust module-specific operational parameters</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-rose-600 transition-all"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        {renderModuleSettings()}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </Card>
  );
};

export default ModulesSettings;

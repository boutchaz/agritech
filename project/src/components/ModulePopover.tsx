import React, { useState } from 'react';
import {
  Settings,
  Boxes,
  Check,
  Lock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Package,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { useModules, useUpdateModule } from '../hooks/useModules';
import { useAddonsOverview } from '../hooks/useAddons';
import { useSubscription } from '../hooks/useSubscription';
import { getPlanDetails, isModuleAvailableForPlan, CATEGORY_LABELS } from '../lib/polar';
import { useNavigate } from '@tanstack/react-router';
import type { ModuleConfig } from '../lib/api/module-config';
import { Button } from '@/components/ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  core: Boxes,
  production: Settings,
  operations: Settings,
  hr: Settings,
  inventory: Package,
  sales: Settings,
  purchasing: Settings,
  accounting: Settings,
  analytics: Settings,
  compliance: ShieldCheck,
  marketplace: ShoppingBag,
};

interface ModulePopoverProps {
  isCollapsed: boolean;
}

export const ModulePopover = ({ isCollapsed: _isCollapsed }: ModulePopoverProps) => {
  const { data: modules = [], isLoading } = useModules();
  const { data: subscription } = useSubscription();
  const { data: addonsOverview } = useAddonsOverview();
  const updateModule = useUpdateModule();
  const navigate = useNavigate();
  const [showAddons, setShowAddons] = useState(false);

  const modulesByCategory = React.useMemo(() => {
    const grouped: Record<string, ModuleConfig[]> = {};
    modules.forEach((module) => {
      const category = module.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(module);
    });
    return grouped;
  }, [modules]);

  const categories = Object.keys(modulesByCategory).sort();

  const handleModuleToggle = async (moduleId: string, currentActive: boolean) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    // Use centralized isModuleAvailableForPlan from lib/polar
    if (!currentActive && !isModuleAvailableForPlan(module, subscription)) {
      // Navigate to subscription page
      navigate({ to: '/settings/subscription' });
      return;
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Plan Info */}
      {(subscription?.formula || subscription?.plan_type) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {getPlanDetails((subscription.formula || subscription.plan_type)!).name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => navigate({ to: '/settings/subscription' })}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Addons Section */}
      {addonsOverview && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <Button
            onClick={() => setShowAddons(!showAddons)}
            className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Addons</span>
              {addonsOverview.slots && addonsOverview.slots.used > 0 && (
                <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {addonsOverview.slots.used}
                </span>
              )}
            </div>
            {showAddons ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </Button>

          {showAddons && addonsOverview && (
            <div className="mt-2 space-y-2 pl-2">
              {addonsOverview.active_addons.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Active</p>
                  {addonsOverview.active_addons.map((activeAddon) => (
                    <div key={activeAddon.id} className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 flex-1">{activeAddon.module.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {addonsOverview.available_addons.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Available</p>
                  {addonsOverview.available_addons.map((addon) => (
                    <div key={addon.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{addon.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {addonsOverview.active_addons.length === 0 && addonsOverview.available_addons.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No addons available
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modules by Category */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-3 pr-2">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                {React.createElement(CATEGORY_ICONS[category] || Boxes, { className: "h-3 w-3" })}
                {CATEGORY_LABELS[category] || category}
              </h4>
              <div className="space-y-1">
                {modulesByCategory[category].map((module) => {
                  const isAvailable = isModuleAvailableForPlan(module, subscription);
                  const isLocked = !isAvailable;

                  return (
                    <Button
                      key={module.id}
                      onClick={() => handleModuleToggle(module.id, !!module.isActive)}
                      disabled={isLocked && !module.isActive}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                        isLocked && !module.isActive ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800",
                        !isLocked && "cursor-pointer"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                            module.isActive
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300 dark:border-gray-600"
                          )}>
                            {module.isActive && <Check className="h-3 w-3" />}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {module.name}
                          </span>
                        </div>
                      </div>
                      {isLocked && !module.isActive && (
                        <Lock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm text-gray-600 dark:text-gray-400"
          onClick={() => navigate({ to: '/settings/subscription' })}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-2" />
          Manage Subscription
        </Button>
      </div>
    </div>
  );
};

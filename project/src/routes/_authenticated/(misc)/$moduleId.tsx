import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useModules } from '@/hooks/useModules'
import { useModuleConfig } from '@/hooks/useModuleConfig'
import ModuleView from '@/components/ModuleView'
import { CATEGORY_LABELS } from '@/lib/polar'
import type { Module } from '@/types'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { SectionLoader } from '@/components/ui/loader';
import {
  Leaf, Package, MapPin, ShoppingCart, Truck, Receipt, Users, Satellite,
  Building, BarChart3, FileText, Calculator, ClipboardList, Wheat, Box,
  Droplets, Sprout, TreeDeciduous, Activity, Settings, Home, Globe,
  FlaskConical as Flask, Beaker, TrendingUp, DollarSign,
  Search, ArrowLeft, type LucideIcon,
} from 'lucide-react';
const MODULE_ICONS: Record<string, LucideIcon> = {
  Leaf, Package, MapPin, ShoppingCart, Truck, Receipt, Users, Satellite,
  Building, BarChart3, FileText, Calculator, ClipboardList, Wheat, Box,
  Droplets, Sprout, TreeDeciduous, Activity, Settings, Home, Globe,
  Flask, Beaker, TrendingUp, DollarSign,
};

function resolveIcon(iconName: string): LucideIcon {
  return MODULE_ICONS[iconName] || Package;
}

function trigrams(s: string): Set<string> {
  const t = new Set<string>();
  const norm = s.toLowerCase().replace(/[\s_-]+/g, '');
  for (let i = 0; i <= norm.length - 3; i++) {
    t.add(norm.slice(i, i + 3));
  }
  return t;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 && tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared++;
  }
  return shared / (ta.size + tb.size - shared);
}

/** Open-source illustration from Flowbite (MIT) — light/dark variants */
function NotFoundIllustration() {
  return (
    <div className="flex justify-center mb-2">
      <img
        src="/assets/searching-light.svg"
        alt=""
        aria-hidden
        className="h-48 sm:h-56 w-auto dark:hidden select-none"
        draggable={false}
      />
      <img
        src="/assets/searching-dark.svg"
        alt=""
        aria-hidden
        className="h-48 sm:h-56 w-auto hidden dark:block select-none"
        draggable={false}
      />
    </div>
  );
}

function ModuleNotFound({ moduleId, activeModules }: { moduleId: string; activeModules: Array<{ id: string; name: string; icon: string; category: string }> }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      navigate({ to: '/dashboard' });
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const suggestions = useMemo(() => {
    const scored = activeModules
      .map((mod) => {
        const nameScore = similarity(moduleId, mod.name);
        const idScore = similarity(moduleId, mod.id);
        return { mod, score: Math.max(nameScore, idScore) };
      })
      .filter((s) => s.score > 0.3 && s.mod.id !== moduleId)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [moduleId, activeModules]);

  const categories = useMemo(() => {
    const cats = new Set(activeModules.map((m) => m.category));
    return Array.from(cats).sort();
  }, [activeModules]);

  const filteredModules = useMemo(() => {
    let mods = activeModules;
    if (selectedCategory) {
      mods = mods.filter((m) => m.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      mods = mods.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[m.category] ?? '').toLowerCase().includes(q),
      );
    }
    return mods;
  }, [activeModules, selectedCategory, searchQuery]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4 sm:p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <NotFoundIllustration />

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t('moduleView.moduleNotFound')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            {t('moduleView.moduleNotFoundDesc', { name: moduleId })}
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-5">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">
              {t('moduleView.moduleNotFoundSuggestion')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map(({ mod }) => {
                const Icon = resolveIcon(mod.icon);
                return (
                  <Button
                    key={mod.id}
                    variant="outline"
                    onClick={() => navigate({ to: `/${mod.id}` })}
                    className="gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {mod.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {activeModules.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('moduleView.availableModules')}
            </h3>

            <div className="relative mb-4">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('moduleView.searchModules')}
                className="ps-9"
              />
            </div>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs"
                >
                  {t('moduleView.allCategories')}
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="text-xs"
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Button>
                ))}
              </div>
            )}

            {filteredModules.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {filteredModules.map((mod) => {
                  const Icon = resolveIcon(mod.icon);
                  return (
                    <Button
                      key={mod.id}
                      onClick={() => navigate({ to: `/${mod.id}` })}
                      variant="outline"
                      className="px-3 py-3 h-auto text-start rounded-lg border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 truncate">
                          {mod.name}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                {t('moduleView.noModulesMatch')}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/dashboard' })}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('moduleView.goToDashboard')}
          </Button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('moduleView.moduleNotFoundHint', 'Press Esc to return to the dashboard')}
        </p>
      </div>
    </div>
  );
}

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { moduleId } = Route.useParams();
  const { data: orgModules = [], isLoading: modulesLoading } = useModules();
  const { data: moduleConfig, isLoading: configLoading } = useModuleConfig();

  if (!currentOrganization) {
    return (
      <SectionLoader />
    );
  }

  if (modulesLoading || configLoading) {
    return (
      <SectionLoader />
    );
  }

  const orgModule = orgModules.find(
    m => m.id === moduleId || m.name.toLowerCase().replace(/\s+/g, '-') === moduleId
  );
  const configModule = moduleConfig?.modules.find(m => m.slug === moduleId);

  const selectedModule: Module | undefined = orgModule
    ? {
        id: orgModule.id,
        name: configModule?.name ?? orgModule.name,
        icon: orgModule.icon || configModule?.icon || 'Leaf',
        active: orgModule.is_active,
        category: orgModule.category || 'agriculture',
        description: configModule?.description ?? orgModule.description ?? '',
      }
    : configModule
      ? {
          id: configModule.slug,
          name: configModule.name,
          icon: configModule.icon || 'Leaf',
          active: true,
          category: configModule.category || 'agriculture',
          description: configModule.description ?? '',
        }
      : undefined;

  if (!selectedModule) {
    const activeModules = orgModules.filter(m => m.is_active);
    return <ModuleNotFound moduleId={moduleId} activeModules={activeModules} />;
  }

  return <ModuleView module={selectedModule} sensorData={[]} />;
};

export const Route = createFileRoute('/_authenticated/(misc)/$moduleId')({
  component: AppContent,
})

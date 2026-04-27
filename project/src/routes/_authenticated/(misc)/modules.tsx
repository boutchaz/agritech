import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useModuleConfig, type ModuleConfig } from '@/hooks/useModuleConfig';
import { useModules } from '@/hooks/useModules';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SectionLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Boxes,
  ChevronRight,
  Lock,
  Mail,
  Package,
  type LucideIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ─── Color palette per category ────────────────────────────────────
const CATEGORY_COLORS: Record<string, { border: string; bg: string; icon: string; badge: string }> = {
  core:        { border: 'border-emerald-100 dark:border-emerald-800/50', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  analytics:   { border: 'border-cyan-100 dark:border-cyan-800/50',       bg: 'bg-cyan-50/50 dark:bg-cyan-900/10',       icon: 'text-cyan-600 dark:text-cyan-400',       badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  hr:          { border: 'border-blue-100 dark:border-blue-800/50',       bg: 'bg-blue-50/50 dark:bg-blue-900/10',       icon: 'text-blue-600 dark:text-blue-400',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  inventory:   { border: 'border-emerald-100 dark:border-emerald-800/50', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  production:  { border: 'border-amber-100 dark:border-amber-800/50',     bg: 'bg-amber-50/50 dark:bg-amber-900/10',     icon: 'text-amber-600 dark:text-amber-400',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  agriculture: { border: 'border-emerald-100 dark:border-emerald-800/50', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  operations:  { border: 'border-purple-100 dark:border-purple-800/50',   bg: 'bg-purple-50/50 dark:bg-purple-900/10',   icon: 'text-purple-600 dark:text-purple-400',   badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  sales:       { border: 'border-rose-100 dark:border-rose-800/50',       bg: 'bg-rose-50/50 dark:bg-rose-900/10',       icon: 'text-rose-600 dark:text-rose-400',       badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  accounting:  { border: 'border-indigo-100 dark:border-indigo-800/50',   bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',   icon: 'text-indigo-600 dark:text-indigo-400',   badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS.core;

function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Package;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return icon || Package;
}

function primaryPath(module: ModuleConfig): string {
  const first = module.navigationItems?.[0];
  if (!first) return '/dashboard';
  // Replace `:param` placeholders with a reasonable default — the modules
  // hub wouldn't navigate to a parameterized URL without context anyway.
  return first.replace(/:[^/]+/g, '').replace(/\/$/, '') || '/dashboard';
}

// ─── ModuleCard ─────────────────────────────────────────────────────
function ModuleCard({
  module,
  active,
  colors,
  onContactSales,
}: {
  module: ModuleConfig;
  active: boolean;
  colors: typeof DEFAULT_CATEGORY_COLOR;
  onContactSales: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const go = () => {
    if (!active) {
      onContactSales(module.slug);
      return;
    }
    const path = primaryPath(module);
    navigate({ to: path });
  };

  return (
    <button
      onClick={go}
      className={cn(
        'relative flex flex-col gap-3 p-4 rounded-2xl border text-left transition-all duration-200 group w-full',
        active
          ? cn(
              'cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50',
              'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
            )
          : 'cursor-pointer border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40',
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-xl', active ? 'bg-white/60 dark:bg-slate-900/40' : 'bg-slate-100 dark:bg-slate-800')}>
          {createElement(resolveIcon(module.icon), {
            className: cn('h-5 w-5', active ? colors.icon : 'text-slate-400 dark:text-slate-600'),
          })}
        </div>
        {active ? (
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
        ) : (
          <Lock className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        )}
      </div>

      <div>
        <h4 className={cn('text-sm font-semibold', active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500')}>
          {module.name}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {module.description}
        </p>
      </div>

      {!active && (
        <div className="mt-auto pt-2">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {t('modules.contactSales', 'Contacter le service commercial')}
          </span>
        </div>
      )}
    </button>
  );
}

// ─── SectionCard ───────────────────────────────────────────────────
function SectionCard({
  category,
  label,
  modules,
  activeSet,
  onContactSales,
}: {
  category: string;
  label: string;
  modules: ModuleConfig[];
  activeSet: Set<string>;
  onContactSales: (slug: string) => void;
}) {
  const colors = CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
  const activeCount = modules.filter((m) => activeSet.has(m.slug)).length;
  const sectionIconName = modules[0]?.icon || 'Package';

  return (
    <Card className={cn('rounded-2xl border overflow-hidden', colors.border)}>
      <div className={cn('flex items-center justify-between px-5 py-4 border-b', colors.bg, colors.border)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/40">
            {createElement(resolveIcon(sectionIconName), {
              className: cn('h-5 w-5', colors.icon),
            })}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
            {label}
          </h3>
        </div>
        <Badge className={cn('border-none text-[10px] font-semibold tracking-wide', colors.badge)}>
          {activeCount}/{modules.length}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.slug}
              module={m}
              active={activeSet.has(m.slug)}
              colors={colors}
              onContactSales={onContactSales}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ModulesHub page ───────────────────────────────────────────────
function ModulesHub() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: config, isLoading: configLoading } = useModuleConfig();
  const { data: orgModules = [], isLoading: orgLoading } = useModules();

  const isLoading = configLoading || orgLoading;

  const activeSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of orgModules) {
      if (m.isActive && m.slug) s.add(m.slug);
    }
    if (config) {
      for (const m of config.modules) {
        if (m.isRequired) s.add(m.slug);
      }
    }
    return s;
  }, [orgModules, config]);

  const groupedModules = useMemo(() => {
    if (!config) return [];
    const available = config.modules.filter((m) => m.isAvailable);
    const byCategory = new Map<string, ModuleConfig[]>();
    for (const m of available) {
      const cat = m.category || 'other';
      const list = byCategory.get(cat) || [];
      list.push(m);
      byCategory.set(cat, list);
    }
    // Sort modules within each category by display_order
    for (const [, list] of byCategory) {
      list.sort((a, b) => a.displayOrder - b.displayOrder);
    }
    // Sort categories by min display_order of their modules
    return Array.from(byCategory.entries())
      .map(([category, mods]) => ({ category, modules: mods }))
      .sort((a, b) => {
        const minA = Math.min(...a.modules.map((m) => m.displayOrder));
        const minB = Math.min(...b.modules.map((m) => m.displayOrder));
        return minA - minB;
      });
  }, [config]);

  const categoryLabel = (cat: string): string => {
    const key = `modules.sections.${cat}`;
    const fallbacks: Record<string, string> = {
      core: 'Essentiel',
      analytics: 'Analyse & IA',
      hr: 'Personnel',
      inventory: 'Stocks',
      production: 'Production',
      agriculture: 'Agriculture',
      operations: 'Opérations',
      sales: 'Ventes & Achats',
      accounting: 'Comptabilité',
    };
    return t(key, fallbacks[cat] || cat);
  };

  const onContactSales = (slug: string) => {
    const email = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_SALES_EMAIL || 'contact@agrogina.com';
    const subject = encodeURIComponent(`[AgroGina] Activation module: ${slug}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite activer le module "${slug}" pour l'organisation ${currentOrganization?.name || ''}.\n\nMerci.`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (!currentOrganization || isLoading) {
    return <SectionLoader />;
  }

  const totalAvailable = groupedModules.reduce((sum, g) => sum + g.modules.length, 0);
  const totalActive = groupedModules.reduce(
    (sum, g) => sum + g.modules.filter((m) => activeSet.has(m.slug)).length,
    0,
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1920px] px-2 py-3 sm:px-3 md:px-3 md:py-4 lg:px-4 lg:py-6">
      <div className="min-w-0 max-w-full space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('modules.title', 'Modules')}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('modules.subtitle', 'Les fonctionnalités actives pour votre organisation')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {totalActive}/{totalAvailable} {t('modules.active', 'actifs')}
            </Badge>
            {totalActive < totalAvailable && (
              <Button variant="outline" size="sm" onClick={() => onContactSales('general')}>
                <Mail className="w-4 h-4 mr-2" />
                {t('modules.contactSales', 'Contacter le service commercial')}
              </Button>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {groupedModules.map(({ category, modules }) => (
            <SectionCard
              key={category}
              category={category}
              label={categoryLabel(category)}
              modules={modules}
              activeSet={activeSet}
              onContactSales={onContactSales}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(misc)/modules')({
  component: ModulesHub,
});

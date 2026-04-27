import { createElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, Lock, Mail, Package, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useModules } from '../hooks/useModules';
import { useModuleConfig, type ModuleConfig } from '../hooks/useModuleConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionLoader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

/**
 * Read-only modules page for end users (Karim, Hassan, Fatima).
 *
 * Lists active modules for the org and surfaces available-but-inactive
 * modules with a contact-sales CTA. Licensing is managed by system
 * admins in the admin-app — there is no toggle UI here.
 */

function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Package;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return icon || Package;
}

function buildMailto(orgName: string | undefined, slug: string): string {
  const email =
    (import.meta as unknown as { env: Record<string, string | undefined> }).env
      ?.VITE_SALES_EMAIL || 'contact@agrogina.com';
  const subject = encodeURIComponent(`[AgroGina] Activation module: ${slug}`);
  const body = encodeURIComponent(
    `Bonjour,\n\nJe souhaite activer le module "${slug}" pour l'organisation ${orgName ?? ''}.\n\nMerci.`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function ModuleRow({
  module,
  active,
  orgName,
}: {
  module: ModuleConfig;
  active: boolean;
  orgName: string | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border p-4',
        active
          ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
          : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            'p-2 rounded-xl flex-shrink-0',
            active ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800',
          )}
        >
          {active ? (
            createElement(resolveIcon(module.icon), {
              className: 'h-5 w-5 text-emerald-600 dark:text-emerald-400',
            })
          ) : (
            <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-semibold',
              active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {module.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {module.description}
          </p>
        </div>
      </div>

      {active ? (
        <Badge className="border-none bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold">
          {t('modulesSettings.active', 'Activé')}
        </Badge>
      ) : module.isRequired ? (
        <Badge variant="outline" className="text-[10px] text-slate-400">
          {t('modulesSettings.required', 'Requis')}
        </Badge>
      ) : (
        <a
          href={buildMailto(orgName, module.slug)}
          className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400 flex-shrink-0"
        >
          {t('modules.contactSales', 'Contacter le service commercial')}
        </a>
      )}
    </div>
  );
}

const ModulesSettings = () => {
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

  const { activeModules, inactiveModules } = useMemo(() => {
    if (!config) return { activeModules: [], inactiveModules: [] };
    const available = config.modules.filter((m) => m.isAvailable);
    available.sort((a, b) => a.displayOrder - b.displayOrder);
    return {
      activeModules: available.filter((m) => activeSet.has(m.slug)),
      inactiveModules: available.filter((m) => !activeSet.has(m.slug)),
    };
  }, [config, activeSet]);

  if (isLoading || !currentOrganization) {
    return <SectionLoader />;
  }

  const orgName = currentOrganization.name;
  const hasInactive = inactiveModules.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-2 py-3 sm:px-3 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
            <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('modulesSettings.title', 'Modules de votre organisation')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t(
                'modulesSettings.subtitle',
                "Les fonctionnalités activées pour votre abonnement. Contactez le service commercial pour ajouter un module.",
              )}
            </p>
          </div>
        </div>
        {hasInactive && (
          <Button variant="outline" asChild>
            <a href={buildMailto(orgName, 'general')}>
              <Mail className="w-4 h-4 mr-2" />
              {t('modules.contactSales', 'Contacter le service commercial')}
            </a>
          </Button>
        )}
      </div>

      {/* Active */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-2">
            {t('modulesSettings.activeSection', 'Modules activés')}{' '}
            <span className="text-slate-400 ml-1">({activeModules.length})</span>
          </h2>
          {activeModules.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('modulesSettings.noneActive', 'Aucun module activé.')}
            </p>
          ) : (
            activeModules.map((m) => (
              <ModuleRow key={m.slug} module={m} active={true} orgName={orgName} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Inactive */}
      {hasInactive && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-2">
              {t('modulesSettings.availableSection', 'Disponibles sur demande')}{' '}
              <span className="text-slate-400 ml-1">({inactiveModules.length})</span>
            </h2>
            {inactiveModules.map((m) => (
              <ModuleRow key={m.slug} module={m} active={false} orgName={orgName} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModulesSettings;

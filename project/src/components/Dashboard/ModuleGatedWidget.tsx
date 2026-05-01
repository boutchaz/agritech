import type { ComponentType, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useModuleEnabled } from '@/hooks/useModuleEnabled';

interface ModuleGatedWidgetProps {
  /** Module slug from `modules` table — see resources.ts canonical names. */
  moduleSlug: string;
  /** Human label for the locked-state card (already-translated). */
  title: string;
  /** Lucide icon for the locked-state card. */
  icon: ComponentType<{ className?: string }>;
  /** Real widget rendered when module is active for the org. */
  children: ReactNode;
}

/**
 * Wraps a dashboard widget so that:
 *   - module active → render the real widget (children) as-is
 *   - module inactive → render a locked placeholder linking to /settings/modules
 *
 * For non-admin viewers we just render the lock card without the link, since
 * they can't enable modules themselves.
 */
export const ModuleGatedWidget = ({ moduleSlug, title, icon: Icon, children }: ModuleGatedWidgetProps) => {
  const enabled = useModuleEnabled(moduleSlug);
  const { t } = useTranslation();
  const { userRole } = useAuth();

  if (enabled) return <>{children}</>;

  const canActivate =
    userRole?.role_name === 'organization_admin' || userRole?.role_name === 'system_admin';

  const lockedCard = (
    <div className="group flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/30">
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white shadow-sm dark:bg-slate-600">
          <Lock className="h-3 w-3" />
        </div>
      </div>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {canActivate
          ? t('modules.gatedWidget.adminHint', 'Module non activé — cliquez pour l\'activer')
          : t('modules.gatedWidget.userHint', 'Module non activé — contactez votre administrateur')}
      </div>
    </div>
  );

  if (!canActivate) return lockedCard;

  return (
    <Link
      to="/settings/modules"
      className="block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      aria-label={t('modules.gatedWidget.activateAria', 'Activer le module {{name}}', { name: title })}
    >
      {lockedCard}
    </Link>
  );
};

export default ModuleGatedWidget;

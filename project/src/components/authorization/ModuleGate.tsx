import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useModuleBasedDashboard } from '@/hooks/useModuleBasedDashboard';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Lock, Settings, ArrowLeft } from 'lucide-react';

/**
 * Gate component that checks if the current route is allowed by the org's active modules.
 *
 * Uses `navigation_items` from the `modules` table (managed via admin panel)
 * to determine which routes belong to which modules. No hardcoded mapping.
 *
 * Behavior:
 * - If modules haven't loaded yet → show children (avoid flash)
 * - If no modules have navigation_items configured → permissive (show all)
 * - If current path is in an active module's navigation_items → show children
 * - If current path is NOT in any active module's navigation_items → show disabled page
 *
 * Props are optional — when used without props, auto-detects from current path.
 */
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { isNavigationEnabled, availableNavigation, isLoading } = useModuleBasedDashboard();
  const { userRole } = useAuth();

  if (isLoading) return <PageLoader />;

  // Permissive fallback: if no navigation_items configured in any module, allow everything
  if (availableNavigation.length === 0) return <>{children}</>;

  const currentPath = location.pathname;
  const isAllowed = isNavigationEnabled(currentPath);

  if (isAllowed) return <>{children}</>;

  const isAdmin = userRole?.role_name === 'organization_admin' || userRole?.role_name === 'system_admin';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('modules.disabled.title', 'Module non activé')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {t('modules.disabled.descriptionGeneric', 'Cette fonctionnalité n\'est pas activée pour votre organisation.')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          {isAdmin
            ? t('modules.disabled.adminHint', 'Contactez le service commercial pour activer ce module pour votre organisation.')
            : t('modules.disabled.userHint', 'Contactez votre administrateur pour activer ce module.')}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate({ to: '/dashboard' })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('modules.disabled.backToDashboard', 'Retour au tableau de bord')}
          </Button>
          {isAdmin && (
            <Button variant="green" onClick={() => navigate({ to: '/settings/modules' })}>
              <Settings className="w-4 h-4 mr-2" />
              {t('modules.disabled.viewModules', 'Voir mes modules')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModuleGate;

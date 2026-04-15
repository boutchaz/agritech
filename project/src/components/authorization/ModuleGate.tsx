import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useModuleBasedDashboard } from '@/hooks/useModuleBasedDashboard';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Lock, Settings, ArrowLeft } from 'lucide-react';

/**
 * Maps route path prefixes to module slugs.
 * When a user navigates to a route, we check if its module is active.
 */
export const ROUTE_MODULE_MAP: Record<string, string> = {
  // Tier 3 — independently toggleable add-ons
  '/compliance': 'compliance',
  '/marketplace': 'marketplace',
  '/lab-services': 'analytics',
  '/chat': 'analytics',
  // Tier 2 — production pack (these form a tight cluster)
  '/stock': 'inventory',
  '/accounting': 'accounting',
  '/workers': 'hr',
  '/workforce': 'hr',
  '/tasks': 'farm_management',
  '/harvests': 'farm_management',
  '/crops': 'farm_management',
  '/crop-cycles': 'farm_management',
  '/product-applications': 'farm_management',
  '/biological-assets': 'farm_management',
  '/orchards': 'farm_management',
  '/parcels': 'farm_management',
  '/infrastructure': 'farm_management',
  '/pest-alerts': 'farm_management',
  '/quality-control': 'farm_management',
  '/deliveries': 'inventory',
};

/**
 * Resolves the module slug for a given path.
 * Matches the longest prefix first.
 */
export function getModuleForPath(path: string): string | null {
  const entries = Object.entries(ROUTE_MODULE_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [prefix, slug] of entries) {
    if (path.startsWith(prefix)) return slug;
  }
  return null;
}

interface ModuleGateProps {
  /** Module slug to check (e.g., 'compliance', 'marketplace', 'analytics') */
  moduleSlug: string;
  /** Module display name for the disabled page */
  moduleName?: string;
  children: React.ReactNode;
}

/**
 * Gate component that checks if a module is active for the current organization.
 * Shows a "module disabled" page if the module is not active.
 * Renders children normally if the module is active.
 */
export function ModuleGate({ moduleSlug, moduleName, children }: ModuleGateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeModules, isLoading } = useModuleBasedDashboard();
  const { userRole } = useAuth();

  if (isLoading) return <PageLoader />;

  // If no modules loaded yet (first load), allow access to avoid flash
  if (activeModules.length === 0) return <>{children}</>;

  const isActive = activeModules.includes(moduleSlug);

  if (isActive) return <>{children}</>;

  const isAdmin = userRole?.role_name === 'organization_admin' || userRole?.role_name === 'system_admin';
  const displayName = moduleName || moduleSlug.replace(/_/g, ' ');

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
          {t('modules.disabled.description', 'Le module {{module}} n\'est pas activé pour votre organisation.', {
            module: displayName,
          })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          {isAdmin
            ? t('modules.disabled.adminHint', 'Activez-le dans les paramètres pour y accéder.')
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
              {t('modules.disabled.goToSettings', 'Paramètres des modules')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModuleGate;

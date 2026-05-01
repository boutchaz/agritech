import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useAuth } from '@/hooks/useAuth';
import {
  IMPERSONATABLE_ROLES,
  canImpersonate,
  setImpersonatedRole,
  useImpersonatedRole,
} from '@/lib/casl/role-impersonation';

/**
 * Admin-only "View as <role>" toolbar. Sticks to the top of the authenticated
 * shell when an impersonation is active, plus a small floating switcher when
 * not. Only rendered for users whose actual role is system_admin /
 * organization_admin.
 */
export function RoleImpersonationBanner() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const impersonated = useImpersonatedRole();

  if (!canImpersonate(userRole?.role_name)) return null;

  if (!impersonated) {
    return (
      <div className="flex items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900">
        <Eye className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-slate-500">
          {t('impersonation.viewAs', 'View as')}
        </span>
        <Select
          value=""
          onValueChange={(v) => v && setImpersonatedRole(v)}
        >
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <SelectValue
              placeholder={t('impersonation.pickRole', 'Pick a role…')}
            />
          </SelectTrigger>
          <SelectContent>
            {IMPERSONATABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role} className="text-xs">
                {t(`impersonation.roles.${role}`, role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-700 dark:bg-amber-900/20">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <span className="font-medium text-amber-900 dark:text-amber-200">
          {t('impersonation.viewingAs', 'Viewing as')}:
        </span>
        <span className="font-semibold text-amber-900 dark:text-amber-100">
          {t(`impersonation.roles.${impersonated}`, impersonated)}
        </span>
        <span className="hidden text-xs text-amber-700/70 dark:text-amber-300/70 sm:inline">
          {t(
            'impersonation.previewNote',
            'UI preview only — API still uses your real permissions.',
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={impersonated}
          onValueChange={(v) => setImpersonatedRole(v)}
        >
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMPERSONATABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role} className="text-xs">
                {t(`impersonation.roles.${role}`, role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setImpersonatedRole(null)}
        >
          <X className="mr-1 h-3 w-3" />
          {t('impersonation.exit', 'Exit')}
        </Button>
      </div>
    </div>
  );
}

export default RoleImpersonationBanner;

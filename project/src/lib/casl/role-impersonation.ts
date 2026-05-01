import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'agritech.impersonate_role';

const ROLE_LEVELS: Record<string, number> = {
  system_admin: 1,
  organization_admin: 2,
  agronome: 3,
  accountant: 3,
  hr_manager: 3,
  farm_manager: 3,
  warehouse_keeper: 4,
  sales_rep: 4,
  buyer: 4,
  field_supervisor: 4,
  farm_worker: 4,
  day_laborer: 5,
  auditor: 6,
  viewer: 6,
};

export const IMPERSONATABLE_ROLES = [
  'organization_admin',
  'agronome',
  'accountant',
  'hr_manager',
  'farm_manager',
  'warehouse_keeper',
  'sales_rep',
  'buyer',
  'field_supervisor',
  'farm_worker',
  'day_laborer',
  'auditor',
  'viewer',
] as const;

export type ImpersonatableRole = (typeof IMPERSONATABLE_ROLES)[number];

const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function emit() {
  for (const fn of listeners) fn();
}

export function setImpersonatedRole(role: string | null) {
  try {
    if (role) localStorage.setItem(KEY, role);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore quota / private mode */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Hook returning the currently impersonated role (if any). Re-renders when the
 * value changes (across tabs / pages). Initializes from `?role=` URL param on
 * first mount so admins can deep-link to a role view.
 */
export function useImpersonatedRole(): string | null {
  const value = useSyncExternalStore(
    subscribe,
    () => read(),
    () => null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('role');
    if (fromUrl && fromUrl !== value && IMPERSONATABLE_ROLES.includes(fromUrl as any)) {
      setImpersonatedRole(fromUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}

/** Roles permitted to impersonate. */
export function canImpersonate(actualRole: string | undefined): boolean {
  return actualRole === 'system_admin' || actualRole === 'organization_admin';
}

export function levelForRole(name: string): number {
  return ROLE_LEVELS[name] ?? 999;
}

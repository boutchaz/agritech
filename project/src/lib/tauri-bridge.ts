type InvokeArgs = Record<string, unknown>;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window && window.__TAURI__ !== undefined;
}

let tauriInvoke: ((cmd: string, args?: InvokeArgs) => Promise<unknown>) | null = null;

async function getTauriInvoke() {
  if (tauriInvoke) return tauriInvoke;
  
  if (isTauriRuntime()) {
    try {
      const tauri = await import('@tauri-apps/api/tauri');
      tauriInvoke = tauri.invoke;
      return tauriInvoke;
    } catch {
      console.warn('Failed to load @tauri-apps/api, falling back to web mode');
      return null;
    }
  }
  
  return null;
}

export async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  const invokeFunc = await getTauriInvoke();
  
  if (!invokeFunc) {
    throw new Error('Tauri invoke not available in web mode');
  }
  
  return invokeFunc(cmd, args) as Promise<T>;
}

export interface LocalUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

export interface LocalSession {
  user: LocalUser;
  session_id: string;
}

export interface AuthStatus {
  is_authenticated: boolean;
  user: LocalUser | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  currency_code: string | null;
  timezone: string | null;
  language: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrganizationWithRole {
  id: string;
  name: string;
  slug: string | null;
  role: string;
  role_id: string;
  is_active: boolean;
  onboarding_completed: boolean;
  currency: string | null;
  timezone: string | null;
  language: string | null;
}

export interface Farm {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  size: number | null;
  size_unit: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Parcel {
  id: string;
  farm_id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  area: number | null;
  area_unit: string | null;
  boundary: string | null;
  calculated_area: number | null;
  perimeter: number | null;
  soil_type: string | null;
  irrigation_type: string | null;
  crop_category: string | null;
  crop_type: string | null;
  variety: string | null;
  planting_system: string | null;
  spacing: string | null;
  density_per_hectare: number | null;
  plant_count: number | null;
  planting_date: string | null;
  planting_year: number | null;
  rootstock: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ImportResult {
  success: boolean;
  message: string;
  tables_imported: string[];
  records_count: number;
}

export interface BundleValidation {
  valid: boolean;
  export_version: string | null;
  schema_version: string | null;
  org_name: string | null;
  exported_at: string | null;
  error: string | null;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  total: number;
}

export interface SetupData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization_name: string;
}

export const tauriCommands = {
  auth: {
    login: (email: string, password: string) =>
      invoke<LocalSession>('local_login', { email, password }),
    logout: (sessionId: string) =>
      invoke<void>('local_logout', { sessionId }),
    getCurrentUser: (sessionId: string) =>
      invoke<LocalUser | null>('get_current_user', { sessionId }),
    checkStatus: () =>
      invoke<AuthStatus>('check_auth_status'),
    setup: (data: SetupData) =>
      invoke<LocalSession>('local_setup', { data }),
    hasUsers: () =>
      invoke<boolean>('check_has_users'),
  },
  
  organizations: {
    getAll: (userId: string) =>
      invoke<OrganizationWithRole[]>('get_organizations', { userId }),
    getById: (orgId: string) =>
      invoke<Organization | null>('get_organization_by_id', { orgId }),
  },
  
  farms: {
    getAll: (orgId: string) =>
      invoke<Farm[]>('get_farms', { orgId }),
    getById: (farmId: string) =>
      invoke<Farm | null>('get_farm_by_id', { farmId }),
    create: (farm: Omit<Farm, 'id' | 'is_active' | 'created_at' | 'updated_at'>) =>
      invoke<Farm>('create_farm', { farm }),
    update: (farmId: string, updates: Partial<Farm>) =>
      invoke<Farm>('update_farm', { farmId, updates }),
    delete: (farmId: string) =>
      invoke<void>('delete_farm', { farmId }),
  },
  
  parcels: {
    getAll: (farmId?: string, orgId?: string) =>
      invoke<Parcel[]>('get_parcels', { farmId, orgId }),
    getById: (parcelId: string) =>
      invoke<Parcel | null>('get_parcel_by_id', { parcelId }),
    create: (parcel: Omit<Parcel, 'id' | 'is_active' | 'created_at' | 'updated_at'>) =>
      invoke<Parcel>('create_parcel', { parcel }),
    update: (parcelId: string, updates: Partial<Parcel>) =>
      invoke<Parcel>('update_parcel', { parcelId, updates }),
    delete: (parcelId: string) =>
      invoke<void>('delete_parcel', { parcelId }),
  },
  
  import: {
    validateBundle: (bundlePath: string, passphrase: string) =>
      invoke<BundleValidation>('validate_bundle', { bundlePath, passphrase }),
    importBundle: (bundlePath: string, passphrase: string) =>
      invoke<ImportResult>('import_bundle', { bundlePath, passphrase }),
    getStatus: () =>
      invoke<{ in_progress: boolean; current_table: string | null; progress_percent: number; error: string | null }>('get_import_status'),
  },
  
  data: {
    query: <T = unknown>(table: string, filters?: Record<string, unknown>, limit?: number, offset?: number) =>
      invoke<QueryResult<T>>('query_table', { table, filters, limit, offset }),
    insert: (table: string, data: Record<string, unknown>) =>
      invoke<string>('insert_record', { table, data }),
    update: (table: string, id: string, data: Record<string, unknown>) =>
      invoke<void>('update_record', { table, id, data }),
    delete: (table: string, id: string) =>
      invoke<void>('delete_record', { table, id }),
  },
};

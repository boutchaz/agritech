import { isTauriAvailable } from './runtime';

export interface DataProvider {
  auth: {
    login(email: string, password: string): Promise<{ user: { id: string; email: string }; session_id?: string }>;
    logout(sessionId?: string): Promise<void>;
    getCurrentUser(sessionId?: string): Promise<{ id: string; email: string } | null>;
    getSession(): Promise<{ user: { id: string; email: string } | null }>;
  };
  
  organizations: {
    getAll(userId: string): Promise<Array<{
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
    }>>;
    getById(orgId: string): Promise<{
      id: string;
      name: string;
      slug: string | null;
      is_active: boolean;
    } | null>;
  };
  
  farms: {
    getAll(orgId: string): Promise<Array<{
      id: string;
      organization_id: string;
      name: string;
      location: string | null;
      size: number | null;
      manager_name: string | null;
    }>>;
    getById(farmId: string): Promise<{
      id: string;
      name: string;
      organization_id: string;
    } | null>;
    create(farm: { organization_id: string; name: string; location?: string; size?: number }): Promise<{ id: string }>;
    update(farmId: string, updates: Partial<{ name: string; location: string; size: number }>): Promise<{ id: string }>;
    delete(farmId: string): Promise<void>;
  };
  
  parcels: {
    getAll(farmId?: string, orgId?: string): Promise<Array<{
      id: string;
      farm_id: string;
      name: string;
      area: number | null;
    }>>;
    getById(parcelId: string): Promise<{
      id: string;
      farm_id: string;
      name: string;
    } | null>;
    create(parcel: { farm_id: string; name: string; area?: number }): Promise<{ id: string }>;
    update(parcelId: string, updates: Partial<{ name: string; area: number }>): Promise<{ id: string }>;
    delete(parcelId: string): Promise<void>;
  };
}

let dataProviderInstance: DataProvider | null = null;

export async function getDataProvider(): Promise<DataProvider> {
  if (dataProviderInstance) {
    return dataProviderInstance;
  }
  
  if (isTauriAvailable()) {
    const { createDesktopDataProvider } = await import('./desktop-data-provider');
    dataProviderInstance = createDesktopDataProvider();
  } else {
    const { createWebDataProvider } = await import('./web-data-provider');
    dataProviderInstance = createWebDataProvider();
  }
  
  return dataProviderInstance;
}

export function resetDataProvider(): void {
  dataProviderInstance = null;
}

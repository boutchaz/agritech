import type { DataProvider } from './data-provider';
import { tauriCommands } from './tauri-bridge';

const SESSION_KEY = 'agritech_desktop_session';

function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function setStoredSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

function clearStoredSessionId(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function createDesktopDataProvider(): DataProvider {
  return {
    auth: {
      async login(email: string, password: string) {
        const result = await tauriCommands.auth.login(email, password);
        setStoredSessionId(result.session_id);
        return {
          user: {
            id: result.user.id,
            email: result.user.email,
          },
          session_id: result.session_id,
        };
      },
      
      async logout(sessionId?: string) {
        const sid = sessionId || getStoredSessionId();
        if (sid) {
          await tauriCommands.auth.logout(sid);
          clearStoredSessionId();
        }
      },
      
      async getCurrentUser(sessionId?: string) {
        const sid = sessionId || getStoredSessionId();
        if (!sid) return null;
        
        const user = await tauriCommands.auth.getCurrentUser(sid);
        if (!user) return null;
        
        return {
          id: user.id,
          email: user.email,
        };
      },
      
      async getSession() {
        const status = await tauriCommands.auth.checkStatus();
        if (!status.is_authenticated || !status.user) {
          return { user: null };
        }
        return {
          user: {
            id: status.user.id,
            email: status.user.email,
          },
        };
      },
    },
    
    organizations: {
      async getAll(userId: string) {
        const orgs = await tauriCommands.organizations.getAll(userId);
        return orgs.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.role,
          role_id: org.role_id,
          is_active: org.is_active,
          onboarding_completed: org.onboarding_completed,
          currency: org.currency,
          timezone: org.timezone,
          language: org.language,
        }));
      },
      
      async getById(orgId: string) {
        const org = await tauriCommands.organizations.getById(orgId);
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          is_active: org.is_active,
        };
      },
    },
    
    farms: {
      async getAll(orgId: string) {
        const farms = await tauriCommands.farms.getAll(orgId);
        return farms.map(farm => ({
          id: farm.id,
          organization_id: farm.organization_id,
          name: farm.name,
          location: farm.location,
          size: farm.size,
          manager_name: farm.manager_name,
        }));
      },
      
      async getById(farmId: string) {
        const farm = await tauriCommands.farms.getById(farmId);
        if (!farm) return null;
        return {
          id: farm.id,
          name: farm.name,
          organization_id: farm.organization_id,
        };
      },
      
      async create(farm) {
        const result = await tauriCommands.farms.create({
          organization_id: farm.organization_id,
          name: farm.name,
          location: farm.location || null,
          size: farm.size || null,
          size_unit: null,
          manager_name: null,
        });
        return { id: result.id };
      },
      
      async update(farmId, updates) {
        const result = await tauriCommands.farms.update(farmId, updates);
        return { id: result.id };
      },
      
      async delete(farmId) {
        await tauriCommands.farms.delete(farmId);
      },
    },
    
    parcels: {
      async getAll(farmId?: string, orgId?: string) {
        const parcels = await tauriCommands.parcels.getAll(farmId, orgId);
        return parcels.map(parcel => ({
          id: parcel.id,
          farm_id: parcel.farm_id,
          name: parcel.name,
          area: parcel.area,
        }));
      },
      
      async getById(parcelId: string) {
        const parcel = await tauriCommands.parcels.getById(parcelId);
        if (!parcel) return null;
        return {
          id: parcel.id,
          farm_id: parcel.farm_id,
          name: parcel.name,
        };
      },
      
      async create(parcel) {
        const result = await tauriCommands.parcels.create({
          farm_id: parcel.farm_id,
          organization_id: null,
          name: parcel.name,
          description: null,
          area: parcel.area || null,
          area_unit: null,
          boundary: null,
          calculated_area: null,
          perimeter: null,
          soil_type: null,
          irrigation_type: null,
          crop_category: null,
          crop_type: null,
          variety: null,
          planting_system: null,
          spacing: null,
          density_per_hectare: null,
          plant_count: null,
          planting_date: null,
          planting_year: null,
          rootstock: null,
        });
        return { id: result.id };
      },
      
      async update(parcelId, updates) {
        const result = await tauriCommands.parcels.update(parcelId, updates);
        return { id: result.id };
      },
      
      async delete(parcelId) {
        await tauriCommands.parcels.delete(parcelId);
      },
    },
  };
}

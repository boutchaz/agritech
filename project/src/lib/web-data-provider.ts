import type { DataProvider } from './data-provider';
import { usersApi } from './api/users';
import { farmsApi } from './api/farms';
import { parcelsApi } from './api/parcels';
import { useAuthStore } from '../stores/authStore';

export function createWebDataProvider(): DataProvider {
  return {
    auth: {
      async login(email: string, password: string) {
        const { loginViaApi } = await import('./auth-api');
        const result = await loginViaApi(email, password);
        return {
          user: {
            id: result.user.id,
            email: result.user.email,
          },
        };
      },

      async logout() {
        useAuthStore.getState().clearAuth();
      },

      async getCurrentUser() {
        const authUser = useAuthStore.getState().user;
        if (!authUser) return null;
        return {
          id: authUser.id,
          email: authUser.email,
        };
      },

      async getSession() {
        const authUser = useAuthStore.getState().user;
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        if (!isAuthenticated || !authUser) {
          return { user: null };
        }
        return {
          user: {
            id: authUser.id,
            email: authUser.email,
          },
        };
      },
    },
    
    organizations: {
      async getAll(_userId: string) {
        const orgs = await usersApi.getMyOrganizations();
        return orgs.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug || null,
          role: org.role,
          role_id: org.role_id || '',
          is_active: org.is_active,
          onboarding_completed: org.onboarding_completed || false,
          currency: org.currency || null,
          timezone: org.timezone || null,
          language: org.language || null,
        }));
      },
      
      async getById(orgId: string) {
        const orgs = await usersApi.getMyOrganizations();
        const org = orgs.find(o => o.id === orgId);
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug || null,
          is_active: org.is_active,
        };
      },
    },
    
    farms: {
      async getAll(orgId: string) {
        const result = await farmsApi.getAll({ organization_id: orgId }, orgId);
        const farms = 'farms' in result ? (result as { farms: unknown[] }).farms : result;
        return (farms as unknown[]).map((farm: unknown) => {
          const f = farm as Record<string, unknown>;
          return {
            id: (f.farm_id || f.id) as string,
            organization_id: orgId,
            name: (f.farm_name || f.name) as string,
            location: (f.farm_location || f.location || null) as string | null,
            size: (f.farm_size || f.size || null) as number | null,
            manager_name: (f.manager_name || null) as string | null,
          };
        });
      },
      
      async getById(farmId: string) {
        const result = await farmsApi.getOne(farmId);
        if (!result) return null;
        const f = result as Record<string, unknown>;
        return {
          id: (f.farm_id || f.id) as string,
          name: (f.farm_name || f.name) as string,
          organization_id: f.organization_id as string,
        };
      },
      
      async create(farm) {
        const result = await farmsApi.create(farm);
        return { id: (result as { id: string }).id };
      },
      
      async update(farmId, updates) {
        const result = await farmsApi.update(farmId, updates);
        return { id: (result as { id: string }).id };
      },
      
      async delete(farmId) {
        await farmsApi.delete(farmId);
      },
    },
    
    parcels: {
      async getAll(farmId?: string, _orgId?: string) {
        const result = await parcelsApi.getAll(farmId ? { farm_id: farmId } : {});
        const parcels = Array.isArray(result) ? result : [];
        return parcels.map((p: unknown) => {
          const parcel = p as Record<string, unknown>;
          return {
            id: parcel.id as string,
            farm_id: parcel.farm_id as string,
            name: parcel.name as string,
            area: (parcel.area || null) as number | null,
          };
        });
      },
      
      async getById(parcelId: string) {
        const result = await parcelsApi.getOne(parcelId);
        if (!result) return null;
        const p = result as Record<string, unknown>;
        return {
          id: p.id as string,
          farm_id: p.farm_id as string,
          name: p.name as string,
        };
      },
      
      async create(parcel) {
        const result = await parcelsApi.create(parcel);
        return { id: (result as { id: string }).id };
      },
      
      async update(parcelId, updates) {
        const result = await parcelsApi.update(parcelId, updates);
        return { id: (result as { id: string }).id };
      },
      
      async delete(parcelId) {
        await parcelsApi.delete(parcelId);
      },
    },
  };
}

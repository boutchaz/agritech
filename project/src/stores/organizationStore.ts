import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Organization {
    id: string;
    name: string;
    description?: string;
    slug?: string;
    currency_code?: string;
    timezone?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface OrganizationState {
    currentOrganization: Organization | null;
    setCurrentOrganization: (organization: Organization | null) => void;
    clearOrganization: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
    persist(
        (set) => ({
            currentOrganization: null,
            setCurrentOrganization: (organization) => set({ currentOrganization: organization }),
            clearOrganization: () => set({ currentOrganization: null }),
        }),
        {
            name: 'organization-storage', // localStorage key
        }
    )
);

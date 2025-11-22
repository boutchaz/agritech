import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const farmsService = {
    async getFarmHierarchy(organizationId: string) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No active session');
        }

        const response = await fetch(`${API_URL}/api/v1/farms/hierarchy`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'x-organization-id': organizationId,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch farm hierarchy');
        }

        return response.json();
    },

    async createFarm(organizationId: string, farmData: any) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No active session');
        }

        const response = await fetch(`${API_URL}/api/v1/farms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'x-organization-id': organizationId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(farmData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create farm');
        }

        return response.json();
    },
};

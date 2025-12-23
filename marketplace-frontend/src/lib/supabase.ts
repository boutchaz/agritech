import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // We're using JWT from ApiClient
    },
});

/**
 * Get authenticated Supabase client with current user's token
 */
export function getAuthenticatedSupabase() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (!token) {
        throw new Error('No authentication token found');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
}

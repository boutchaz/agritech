// Re-export the auth supabase client as the main supabase client
// This ensures session is shared between auth and data operations
import { authSupabase } from './auth-supabase';
import type { Database } from '../types/database.types';

// Use the same client for both auth and data operations
// This ensures the session token is automatically included in all requests
export const supabase = authSupabase;

// Re-export Database type for convenience
export type { Database };

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Commonly used table types
export type UserProfile = Tables<'user_profiles'>;
export type Organization = Tables<'organizations'>;
export type OrganizationUser = Tables<'organization_users'>;
export type Farm = Tables<'farms'>;
export type Parcel = Tables<'parcels'>;
export type Worker = Tables<'workers'>;
export type Analysis = Tables<'analyses'>;
export type Subscription = Tables<'subscriptions'>;

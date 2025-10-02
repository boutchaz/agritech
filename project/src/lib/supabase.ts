import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          timezone: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string;
          full_name?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          timezone?: string;
          language?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          timezone?: string;
          language?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string;
          email?: string;
          phone?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          email?: string;
          phone?: string;
        };
      };
      organization_users: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: string;
          is_active?: boolean;
        };
        Update: {
          role?: string;
          is_active?: boolean;
        };
      };
      farms: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          location: string | null;
          size: number | null;
          size_unit: string;
          manager_name: string | null;
          manager_phone: string | null;
          manager_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          name: string;
          description?: string;
          location?: string;
          size?: number;
          size_unit?: string;
          manager_name?: string;
          manager_phone?: string;
          manager_email?: string;
        };
        Update: {
          name?: string;
          description?: string;
          location?: string;
          size?: number;
          size_unit?: string;
          manager_name?: string;
          manager_phone?: string;
          manager_email?: string;
        };
      };
      tree_categories: {
        Row: {
          id: string;
          organization_id: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          category: string;
        };
        Update: {
          category?: string;
        };
      };
      trees: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      plantation_types: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          spacing: string;
          trees_per_ha: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          type: string;
          spacing: string;
          trees_per_ha: number;
        };
        Update: {
          type?: string;
          spacing?: string;
          trees_per_ha?: number;
        };
      };
    };
  };
};
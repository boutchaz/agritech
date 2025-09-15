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
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
        };
      };
      farms: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          location: string;
          size: number;
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          name: string;
          location: string;
          size: number;
          manager_id?: string;
        };
        Update: {
          name?: string;
          location?: string;
          size?: number;
          manager_id?: string;
        };
      };
    };
  };
};
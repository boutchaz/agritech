import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const authSupabaseUrl = import.meta.env.VITE_AUTH_SUPABASE_URL;
const authSupabaseAnonKey = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY;

if (!authSupabaseUrl) {
  throw new Error('Missing VITE_AUTH_SUPABASE_URL environment variable');
}

if (!authSupabaseAnonKey) {
  throw new Error('Missing VITE_AUTH_SUPABASE_ANON_KEY environment variable');
}

export const authSupabase = createClient<Database>(authSupabaseUrl, authSupabaseAnonKey);

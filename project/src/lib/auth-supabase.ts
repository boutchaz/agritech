import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Cloud Supabase instance for authentication - read from environment variables
const authSupabaseUrl = import.meta.env.VITE_AUTH_SUPABASE_URL || 'https://mvegjdkkbhlhbjpbhpou.supabase.co';
const authSupabaseAnonKey = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.t5RMzdumbehxq5DRtHEbiNOAW4KstcysOFx2xg4Z67E';

if (!authSupabaseUrl || !authSupabaseAnonKey) {
  throw new Error('Missing Auth Supabase environment variables');
}


export const authSupabase = createClient<Database>(authSupabaseUrl, authSupabaseAnonKey);

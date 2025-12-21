import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInternalAdmin: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isInternalAdmin: false,
  });

  const checkInternalAdmin = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('internal_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let isInternalAdmin = false;
      if (session?.user) {
        isInternalAdmin = await checkInternalAdmin(session.user.id);
      }
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isInternalAdmin,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let isInternalAdmin = false;
        if (session?.user) {
          isInternalAdmin = await checkInternalAdmin(session.user.id);
        }
        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isInternalAdmin,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, [checkInternalAdmin]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...state,
    signIn,
    signOut,
  };
}

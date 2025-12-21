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
      console.log('Checking internal admin status for:', userId);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('checkInternalAdmin timeout')), 5000)
      );

      const queryPromise = supabase
        .from('internal_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) {
        console.error('Error checking internal admin:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Failed to check internal admin:', error);
      return false;
    }
  }, []);


  useEffect(() => {
    let mounted = true;

    // Get initial session with timeout to prevent hanging
    const initSession = async () => {
      try {
        // Add timeout to prevent getSession from hanging indefinitely
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
          return;
        }

        let isInternalAdmin = false;
        if (session?.user) {
          isInternalAdmin = await checkInternalAdmin(session.user.id);
        }

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            isLoading: false,
            isInternalAdmin,
          });
        }
      } catch {
        // On timeout or error, just set loading to false so user can try to login
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        let isInternalAdmin = false;
        if (session?.user) {
          console.log('Checking internal admin for:', session.user.id);
          isInternalAdmin = await checkInternalAdmin(session.user.id);
          console.log('Is internal admin:', isInternalAdmin);
        }

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            isLoading: false,
            isInternalAdmin,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

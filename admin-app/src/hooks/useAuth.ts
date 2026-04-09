import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Cache: once we confirm a user is admin, remember it for the session
  const adminCacheRef = useRef<Map<string, boolean>>(new Map());

  const checkInternalAdmin = useCallback(async (userId: string) => {
    // Return cached result if available
    const cached = adminCacheRef.current.get(userId);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('internal_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Error checking internal admin:', error);
        return false;
      }

      const isAdmin = !!(data && data.length > 0);
      adminCacheRef.current.set(userId, isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('Failed to check internal admin:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (mounted) setState(prev => ({ ...prev, isLoading: false }));
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
        if (mounted) setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // On token refresh, keep existing admin status — don't re-query
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user ?? null,
            session,
          }));
          return;
        }

        // On sign-in or initial session, check admin status
        let isInternalAdmin = false;
        if (session?.user) {
          isInternalAdmin = await checkInternalAdmin(session.user.id);
        } else {
          // Signed out — clear cache
          adminCacheRef.current.clear();
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
    adminCacheRef.current.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...state,
    signIn,
    signOut,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/** Prevent infinite spinner when Supabase / network never resolves */
const GET_SESSION_TIMEOUT_MS = 8_000;
const INTERNAL_ADMIN_CHECK_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
      const internalAdminQuery = supabase
        .from('internal_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      const { data, error } = await withTimeout(
        Promise.resolve(internalAdminQuery),
        INTERNAL_ADMIN_CHECK_TIMEOUT_MS,
        'internal-admin-check',
      );

      if (error) {
        console.error('Error checking internal admin:', error);
        return false;
      }

      const isAdmin = !!(data && data.length > 0);
      adminCacheRef.current.set(userId, isAdmin);
      return isAdmin;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('[useAuth] Internal admin check timed out');
      } else {
        console.error('Failed to check internal admin:', error);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          GET_SESSION_TIMEOUT_MS,
          'getSession',
        );

        if (error) {
          if (mounted) setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Validate session against server — detects deleted user / revoked JWT
        let validUser: User | null = null;
        if (session?.user) {
          try {
            const { data: { user: serverUser }, error: getUserError } = await withTimeout(
              supabase.auth.getUser(),
              GET_SESSION_TIMEOUT_MS,
              'getUser',
            );
            if (getUserError || !serverUser) {
              console.warn('[useAuth] Stale session — signing out', getUserError);
              await supabase.auth.signOut();
              if (mounted) {
                setState({ user: null, session: null, isLoading: false, isInternalAdmin: false });
              }
              return;
            }
            validUser = serverUser;
          } catch (e) {
            console.warn('[useAuth] getUser failed — signing out', e);
            await supabase.auth.signOut();
            if (mounted) {
              setState({ user: null, session: null, isLoading: false, isInternalAdmin: false });
            }
            return;
          }
        }

        let isInternalAdmin = false;
        if (validUser) {
          isInternalAdmin = await checkInternalAdmin(validUser.id);
        }

        if (mounted) {
          setState({
            user: validUser,
            session: validUser ? session : null,
            isLoading: false,
            isInternalAdmin,
          });
        }
      } catch (e) {
        console.warn('[useAuth] getSession timed out or failed:', e);
        if (mounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isInternalAdmin: false,
          });
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          adminCacheRef.current.clear();
          setState({ user: null, session: null, isLoading: false, isInternalAdmin: false });
          return;
        }

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

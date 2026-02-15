'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Failed to get session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [supabase]);

   const signOut = useCallback(async () => {
     // Get current session before signing out
     const { data: { session: currentSession } } = await supabase.auth.getSession();
     
     // Call logout API with fire-and-forget (before supabase.auth.signOut)
     if (currentSession?.access_token) {
       try {
         const apiUrl = process.env.NEXT_PUBLIC_API_URL;
         fetch(`${apiUrl}/api/v1/auth/logout`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${currentSession.access_token}`,
             'Content-Type': 'application/json'
           }
         }).catch(() => {}); // Fire-and-forget, ignore errors
       } catch {
         // Fire-and-forget
       }
     }
     
     // Proceed with existing cleanup
     const { error } = await supabase.auth.signOut();
     if (error) throw error;
     setUser(null);
     setSession(null);
   }, [supabase]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

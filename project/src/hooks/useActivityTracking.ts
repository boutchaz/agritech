import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { authSupabase } from '@/lib/auth-supabase';

/**
 * Hook to track user activity and update their last activity timestamp.
 * This enables the live dashboard to show concurrent users accurately.
 *
 * Updates the user's profile every 2 minutes while the tab is active.
 */
export function useActivityTracking() {
  const { user, currentOrganization } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const MIN_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes

  useEffect(() => {
    if (!user?.id) return;

    const updateActivity = async () => {
      const now = Date.now();
      // Prevent too frequent updates
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) return;

      lastUpdateRef.current = now;

      try {
        // Update the user's profile updated_at timestamp
        await authSupabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', user.id);

        // Also update organization_users last_login if in an organization
        if (currentOrganization?.id) {
          await authSupabase
            .from('organization_users')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('organization_id', currentOrganization.id);
        }
      } catch {
        // Silently fail - activity tracking is non-critical
      }
    };

    // Update immediately on mount
    updateActivity();

    // Set up periodic updates
    const intervalId = setInterval(updateActivity, MIN_UPDATE_INTERVAL);

    // Update on user interactions
    const handleActivity = () => {
      updateActivity();
    };

    // Track meaningful user activity
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });

    // Update when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, currentOrganization?.id]);
}

import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useEffect } from 'react';
import { AnimatedBackground } from '@/components/onboarding/AnimatedBackground';
import { Sprout } from 'lucide-react';

export const Route = createFileRoute('/(public)/onboarding')({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const initialize = useOnboardingStore((state) => state.initialize);
  const isRestored = useOnboardingStore((state) => state.isRestored);

  // Initialize store from backend API
  useEffect(() => {
    if (user?.id) {
      initialize(user.id, user.email || '', profile);
    }
  }, [user?.id, user?.email, profile, initialize]);

  // Show loading while checking auth or loading state
  if (loading || !isRestored) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25" />
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: '/login' });
    return null;
  }

  return (
    <AnimatedBackground>
      {/* Header with logo */}
      <div className="fixed top-0 left-0 right-0 z-10 py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <Sprout className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-800">AgroGina</span>
          </div>
        </div>
      </div>
      {/* Outlet for child routes - centered in remaining viewport */}
      <div className="flex items-center justify-center min-h-screen pt-16 px-4">
        <Outlet />
      </div>
    </AnimatedBackground>
  );
}

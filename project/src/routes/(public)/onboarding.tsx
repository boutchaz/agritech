import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

export const Route = createFileRoute('/(public)/onboarding')({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
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
    <OnboardingWizard user={user}>
      <OnboardingProvider userId={user.id} email={user.email || ''}>
        <Outlet />
      </OnboardingProvider>
    </OnboardingWizard>
  );
}

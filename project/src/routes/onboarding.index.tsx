import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import OnboardingFlow from '../components/OnboardingFlow';
import { useAuth } from '../components/MultiTenantAuthProvider';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, needsOnboarding, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user doesn't need onboarding, redirect to dashboard
    if (!loading && !needsOnboarding) {
      navigate({ to: '/' });
    }
  }, [needsOnboarding, loading, navigate]);

  const handleComplete = async () => {
    // After onboarding, redirect to subscription page to complete payment
    // (In production, user needs to subscribe via Polar.sh before accessing dashboard)
    window.location.href = '/settings/subscription';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  return <OnboardingFlow user={user} onComplete={handleComplete} />;
}
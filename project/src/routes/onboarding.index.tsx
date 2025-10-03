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

  console.log('🔍 OnboardingPage state:', { user: !!user, needsOnboarding, loading });

  useEffect(() => {
    console.log('🔍 OnboardingPage useEffect:', { loading, needsOnboarding });
    // If user doesn't need onboarding, redirect to dashboard
    if (!loading && !needsOnboarding) {
      console.log('❌ Redirecting away from onboarding (user does not need onboarding)');
      navigate({ to: '/' });
    }
  }, [needsOnboarding, loading, navigate]);

  const handleComplete = async () => {
    // After onboarding, redirect to subscription page to complete payment
    // (In production, user needs to subscribe via Polar.sh before accessing dashboard)
    window.location.href = '/settings/subscription';
  };

  if (loading) {
    console.log('⏳ Showing loading spinner (loading = true)');
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
    console.log('❌ No user, redirecting to /');
    navigate({ to: '/' });
    return null;
  }

  console.log('✅ Rendering OnboardingFlow component');
  return <OnboardingFlow user={user} onComplete={handleComplete} />;
}
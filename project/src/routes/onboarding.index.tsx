import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import OnboardingFlow from '../components/OnboardingFlow';
import { useAuth } from '../components/MultiTenantAuthProvider';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, needsOnboarding, loading, profile } = useAuth();
  const navigate = useNavigate();

  console.log('🔍 OnboardingPage state:', { user: !!user, needsOnboarding, loading });
  console.log('🔍 OnboardingPage user details:', user ? { id: user.id, email: user.email } : null);

  useEffect(() => {
    console.log('🔍 OnboardingPage useEffect:', { loading, needsOnboarding, profile: !!profile });
    // Only redirect if user truly doesn't need onboarding AND has a complete profile
    if (!loading && !needsOnboarding && user && profile && profile.first_name && profile.last_name) {
      console.log('✅ User has complete profile, redirecting to dashboard');
      navigate({ to: '/' });
    } else if (!loading && !needsOnboarding && user) {
      console.log('🔍 User profile incomplete or missing, staying on onboarding');
    }
  }, [needsOnboarding, loading, navigate, user, profile]);

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
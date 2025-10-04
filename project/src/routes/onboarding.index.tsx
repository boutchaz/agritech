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
  console.log('🔍 OnboardingPage user details:', user ? { id: user.id, email: user.email } : null);

  useEffect(() => {
    console.log('🔍 OnboardingPage useEffect:', { loading, needsOnboarding });
    // If user doesn't need onboarding, redirect to dashboard
    if (!loading && !needsOnboarding) {
      console.log('❌ Redirecting away from onboarding (user does not need onboarding)');
      console.log('🔍 DEBUG: Temporarily disabling redirect to debug onboarding issue');
      // navigate({ to: '/' }); // Temporarily commented out for debugging
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
  
  // Debug: Show onboarding even if needsOnboarding is false
  if (!needsOnboarding) {
    console.log('🔍 DEBUG: needsOnboarding is false, but showing onboarding anyway for debugging');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Debug: Onboarding Page
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              needsOnboarding: {needsOnboarding ? 'true' : 'false'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              User: {user ? `${user.email} (${user.id})` : 'No user'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Loading: {loading ? 'true' : 'false'}
            </p>
            <div className="mt-6">
              <OnboardingFlow user={user} onComplete={handleComplete} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return <OnboardingFlow user={user} onComplete={handleComplete} />;
}
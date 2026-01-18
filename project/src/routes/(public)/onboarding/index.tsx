import { createFileRoute, useNavigate } from '@tanstack/react-router';
import EnhancedOnboardingFlow from '@/components/EnhancedOnboardingFlow';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { authSupabase } from '@/lib/auth-supabase';

export const Route = createFileRoute('/(public)/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading, refreshUserData } = useAuth();

  const handleOnboardingComplete = async () => {
    // Mark onboarding as completed in user profile
    try {
      if (user?.id) {
        const { error: updateError } = await authSupabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        if (updateError) {
          console.warn('⚠️ Failed to mark onboarding as completed:', updateError);
        } else {
          console.log('✅ Onboarding marked as completed');
        }
      }
    } catch (err) {
      console.warn('⚠️ Error updating onboarding status:', err);
    }

    // Refresh auth data to get updated onboarding_completed flag
    await refreshUserData();

    // Navigate to dashboard after onboarding is complete
    navigate({ to: '/' });
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    navigate({ to: '/login' });
    return null;
  }

  return (
    <EnhancedOnboardingFlow
      user={user}
      onComplete={handleOnboardingComplete}
    />
  );
}
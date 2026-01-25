import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useAuth } from '@/hooks/useAuth';
import { authSupabase } from '@/lib/auth-supabase';

export const Route = createFileRoute('/(public)/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, refreshUserData } = useAuth();

  const handleOnboardingComplete = async () => {
    // Mark onboarding as completed in user profile
    try {
      if (user?.id) {
        const { error: updateError } = await authSupabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        if (updateError) {
          console.warn('Failed to mark onboarding as completed:', updateError);
        } else {
          console.log('Onboarding marked as completed');
        }
      }
    } catch (err) {
      console.warn('Error updating onboarding status:', err);
    }

    // Refresh auth data to get updated onboarding_completed flag
    await refreshUserData();

    // Navigate to dashboard after onboarding is complete
    navigate({ to: '/' });
  };

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

  // If no user, redirect to login
  if (!user) {
    navigate({ to: '/login' });
    return null;
  }

  return (
    <OnboardingWizard
      user={user}
      onComplete={handleOnboardingComplete}
    />
  );
}

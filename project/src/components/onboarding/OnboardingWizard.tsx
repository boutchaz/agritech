import React, { useState, useEffect } from 'react';
import { User, Building2, Sprout, Sparkles, Rocket } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';
import { AnimatedProgress } from './AnimatedProgress';
import { StepTransition } from './StepTransition';
import { ConfettiEffect } from './ConfettiEffect';
import { WelcomeStep } from './steps/WelcomeStep';
import { OrganizationStep } from './steps/OrganizationStep';
import { FarmStep } from './steps/FarmStep';
import { ModulesStep } from './steps/ModulesStep';
import { CompletionStep } from './steps/CompletionStep';
import { useOnboardingBackendPersistence } from '../../hooks/useOnboardingBackendPersistence';
import { onboardingApi, CheckSlugAvailabilityResponse } from '@/lib/api/onboarding';

interface OnboardingWizardProps {
  user: { id: string; email?: string } | null;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Profil', icon: <User className="w-4 h-4" /> },
  { id: 2, title: 'Organisation', icon: <Building2 className="w-4 h-4" /> },
  { id: 3, title: 'Ferme', icon: <Sprout className="w-4 h-4" /> },
  { id: 4, title: 'Modules', icon: <Sparkles className="w-4 h-4" /> },
  { id: 5, title: 'Lancement', icon: <Rocket className="w-4 h-4" /> },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
  const {
    state,
    isRestored,
    clearState,
    updateProfileData,
    updateOrganizationData,
    updateFarmData,
    updateModuleSelection,
    updatePreferences,
    setCurrentStep,
    setExistingOrgId,
  } = useOnboardingBackendPersistence(user?.id || '', user?.email || '');

  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stepJustCompleted, setStepJustCompleted] = useState<number | null>(null);

  const {
    currentStep,
    profileData,
    organizationData,
    farmData,
    moduleSelection,
    preferences,
    existingOrgId,
  } = state;

  // Show mini confetti on step completion
  useEffect(() => {
    if (stepJustCompleted !== null) {
      const timer = setTimeout(() => setStepJustCompleted(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [stepJustCompleted]);

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setDirection('backward');
    } else {
      setDirection('forward');
    }
    setCurrentStep(step);
  };

  const handleNext = async (targetStep: number) => {
    setError(null);
    setIsLoading(true);

    try {
      // Save current step data to backend
      if (currentStep === 1) {
        await onboardingApi.saveProfile(profileData);
      } else if (currentStep === 2) {
        const result = await onboardingApi.saveOrganization(organizationData, existingOrgId || undefined);
        if (result.id && !existingOrgId) {
          setExistingOrgId(result.id);
        }
      } else if (currentStep === 3) {
        await onboardingApi.saveFarm(farmData);
      } else if (currentStep === 4) {
        await onboardingApi.saveModules(moduleSelection);
      }

      setStepJustCompleted(currentStep);
      setDirection('forward');
      setCurrentStep(targetStep);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await onboardingApi.savePreferencesAndComplete(preferences);
      setShowConfetti(true);
      
      // Wait for confetti animation before completing
      setTimeout(() => {
        clearState();
        onComplete();
      }, 2500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string): Promise<CheckSlugAvailabilityResponse> => {
    return onboardingApi.checkSlugAvailability(slug);
  };

  // Loading state
  if (!isRestored) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25" />
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <p className="text-gray-600">Chargement de votre espace...</p>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const selectedModulesCount = Object.values(moduleSelection).filter(Boolean).length;

  return (
    <AnimatedBackground>
      {/* Confetti effects */}
      <ConfettiEffect isActive={showConfetti} duration={2500} particleCount={150} />
      
      {/* Step completion mini confetti */}
      {stepJustCompleted !== null && (
        <ConfettiEffect 
          isActive={true} 
          duration={1200} 
          particleCount={30}
          colors={['#10B981', '#34D399', '#6EE7B7']}
        />
      )}

      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
              <Sprout className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-800">AgriTech</span>
            </div>
          </div>

          {/* Progress indicator */}
          <AnimatedProgress
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={(step) => {
              if (step < currentStep) goToStep(step);
            }}
          />

          {/* Error message */}
          {error && (
            <div className="mt-6 max-w-lg mx-auto p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-slide-down">
              {error}
            </div>
          )}

          {/* Main content card */}
          <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-12">
            <StepTransition stepKey={currentStep} direction={direction}>
              {currentStep === 1 && (
                <WelcomeStep
                  profileData={profileData}
                  onUpdate={updateProfileData}
                  onNext={() => handleNext(2)}
                />
              )}

              {currentStep === 2 && (
                <OrganizationStep
                  organizationData={organizationData}
                  existingOrgId={existingOrgId}
                  onUpdate={updateOrganizationData}
                  onCheckSlug={checkSlugAvailability}
                  onNext={() => handleNext(3)}
                />
              )}

              {currentStep === 3 && (
                <FarmStep
                  farmData={farmData}
                  onUpdate={updateFarmData}
                  onNext={() => handleNext(4)}
                />
              )}

              {currentStep === 4 && (
                <ModulesStep
                  moduleSelection={moduleSelection}
                  onUpdate={updateModuleSelection}
                  onNext={() => handleNext(5)}
                />
              )}

              {currentStep === 5 && (
                <CompletionStep
                  preferences={preferences}
                  profileName={`${profileData.first_name} ${profileData.last_name}`}
                  organizationName={organizationData.name}
                  farmName={farmData.name}
                  selectedModulesCount={selectedModulesCount}
                  onUpdate={updatePreferences}
                  onComplete={handleComplete}
                  isLoading={isLoading}
                />
              )}
            </StepTransition>
          </div>

          {/* Back button (except on first and last step) */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => goToStep(currentStep - 1)}
                disabled={isLoading}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                ← Étape précédente
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </AnimatedBackground>
  );
};

export default OnboardingWizard;

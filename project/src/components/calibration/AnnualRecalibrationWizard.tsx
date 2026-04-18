import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSnoozeAnnualReminder } from '@/hooks/useAnnualRecalibration';
import { AnnualBaselineValidationStep } from './steps/annual/AnnualBaselineValidationStep';
import { AnnualCampaignBilanStep } from './steps/annual/AnnualCampaignBilanStep';
import { AnnualMissingTasksStep } from './steps/annual/AnnualMissingTasksStep';
import { AnnualNewAnalysesStep } from './steps/annual/AnnualNewAnalysesStep';
import { AnnualTriggerStep } from './steps/annual/AnnualTriggerStep';

interface AnnualRecalibrationWizardProps {
  parcelId: string;
  estimatedCampaignCount?: number;
  onClose: () => void;
}

interface WizardStep {
  number: number;
  title: string;
}

const STEPS: WizardStep[] = [
  { number: 1, title: 'Declenchement' },
  { number: 2, title: 'Taches annuelles' },
  { number: 3, title: 'Nouvelles analyses' },
  { number: 4, title: 'Bilan de campagne' },
  { number: 5, title: 'Validation du profil de reference' },
];

export function AnnualRecalibrationWizard({
  parcelId,
  estimatedCampaignCount,
  onClose,
}: AnnualRecalibrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step4Ready, setStep4Ready] = useState(false);
  const snoozeAnnualReminder = useSnoozeAnnualReminder(parcelId);

  const goNext = useCallback(() => {
    setCurrentStep((previous) => Math.min(5, previous + 1));
  }, []);

  const goPrevious = useCallback(() => {
    setCurrentStep((previous) => Math.max(1, previous - 1));
  }, []);

  useEffect(() => {
    if (currentStep !== 4 || !step4Ready) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentStep(5);
      setStep4Ready(false);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [currentStep, step4Ready]);

  const handleSnooze = async (days: number) => {
    await snoozeAnnualReminder.mutateAsync(days);
    onClose();
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return <AnnualTriggerStep parcelId={parcelId} onProceed={goNext} onSnooze={handleSnooze} />;
    }

    if (currentStep === 2) {
      return <AnnualMissingTasksStep parcelId={parcelId} onContinue={goNext} />;
    }

    if (currentStep === 3) {
      return <AnnualNewAnalysesStep parcelId={parcelId} onContinueIfNone={goNext} />;
    }

    if (currentStep === 4) {
      return (
        <AnnualCampaignBilanStep
          parcelId={parcelId}
          onReadyForAutoAdvance={() => {
            setStep4Ready(true);
          }}
        />
      );
    }

    return (
        <AnnualBaselineValidationStep
          parcelId={parcelId}
          estimatedCampaignCount={estimatedCampaignCount}
          onValidated={() => {
            toast.success(
              'Recalibrage annuel lance. La baseline sera mise a jour une fois la calibration terminee.',
            );
            onClose();
          }}
        />
    );
  };

  return (
    <div
      className="min-w-0 max-w-full space-y-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:space-y-4 sm:p-4"
      data-testid="calibration-annual-wizard"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Assistant de recalibrage annuel</h3>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            Validation post-campagne et mise a jour du profil agronomique de reference.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0 self-end sm:self-start">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40 sm:p-4">
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Etape {currentStep} sur {STEPS.length}</p>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white break-words mb-2">
            {STEPS[currentStep - 1]?.title}
          </p>
          <div className="flex gap-1" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((step) => {
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <div
                  key={step.number}
                  className={`h-1.5 min-w-0 flex-1 rounded-full ${
                    isActive
                      ? 'bg-blue-600'
                      : isCompleted
                        ? 'bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-1 md:gap-y-3">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    isCompleted
                      ? 'border-green-600 bg-green-600 text-white'
                      : isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                </div>
                <div className="ml-2 mr-2 max-w-[7rem] lg:max-w-none">
                  <p
                    className={`text-sm font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-4 shrink-0 sm:w-6 lg:w-8 ${isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:space-y-4 sm:p-4">
        <div className="min-w-0">{renderStep()}</div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goPrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto"
          >
            Precedent
          </Button>

          {currentStep !== 1 && (
            <Button
              variant="blue"
              type="button"
              onClick={goNext}
              disabled={currentStep >= 5 || (currentStep === 4 && step4Ready)}
              className="w-full sm:w-auto"
            >
              {currentStep === 4 && step4Ready ? 'Passage automatique...' : 'Suivant'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

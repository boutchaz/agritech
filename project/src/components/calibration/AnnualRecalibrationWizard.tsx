import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { F3BaselineValidationStep } from './steps/f3/F3BaselineValidationStep';
import { F3CampaignBilanStep } from './steps/f3/F3CampaignBilanStep';
import { F3MissingTasksStep } from './steps/f3/F3MissingTasksStep';
import { F3NewAnalysesStep } from './steps/f3/F3NewAnalysesStep';
import { F3TriggerStep } from './steps/f3/F3TriggerStep';

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

  const handleSnooze = (days: number) => {
    toast.success(`Rappel programme dans ${days} jour(s).`);
    onClose();
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return <F3TriggerStep parcelId={parcelId} onProceed={goNext} onSnooze={handleSnooze} />;
    }

    if (currentStep === 2) {
      return <F3MissingTasksStep parcelId={parcelId} onContinue={goNext} />;
    }

    if (currentStep === 3) {
      return <F3NewAnalysesStep parcelId={parcelId} onContinueIfNone={goNext} />;
    }

    if (currentStep === 4) {
      return (
        <F3CampaignBilanStep
          parcelId={parcelId}
          onReadyForAutoAdvance={() => {
            setStep4Ready(true);
          }}
        />
      );
    }

    return (
      <F3BaselineValidationStep
        parcelId={parcelId}
        estimatedCampaignCount={estimatedCampaignCount}
        onValidated={() => {
          toast.success('Baseline annuelle mise a jour.');
          onClose();
        }}
      />
    );
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assistant de recalibrage annuel F3</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Validation post-campagne et mise a jour du profil agronomique de reference.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[760px] items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    isCompleted
                      ? 'bg-green-600 border-green-600 text-white'
                      : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                </div>
                <div className="ml-2 mr-3">
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 ${isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
        {renderStep()}

        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button type="button" variant="outline" onClick={goPrevious} disabled={currentStep === 1}>
            Precedent
          </Button>

          {currentStep !== 1 && (
            <Button
              type="button"
              onClick={goNext}
              disabled={currentStep >= 5 || (currentStep === 4 && step4Ready)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentStep === 4 && step4Ready ? 'Passage automatique...' : 'Suivant'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

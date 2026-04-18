import { CalendarClock, Clock3, Sprout } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useAnnualEligibility } from '@/hooks/useAnnualRecalibration';

interface AnnualTriggerStepProps {
  parcelId: string;
  onProceed: () => void;
  onSnooze: (days: number) => Promise<void> | void;
}

function formatDate(date?: string): string {
  if (!date) {
    return 'Date non disponible';
  }

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function AnnualTriggerStep({ parcelId, onProceed, onSnooze }: AnnualTriggerStepProps) {
  const { data: eligibility, isLoading } = useAnnualEligibility(parcelId);
  const [customDays, setCustomDays] = useState<number>(14);

  return (
    <div className="space-y-5" data-testid="calibration-annual-wizard-trigger">
      <div className="rounded-xl border border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/20 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-2">
            <Sprout className="h-5 w-5 text-green-700 dark:text-green-300" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-green-900 dark:text-green-100">
              Recalibrage annuel post-campagne
            </h4>
            <p className="mt-1 text-sm text-green-800 dark:text-green-200">
              Votre recolte est-elle completement terminee sur l&apos;ensemble de la parcelle? Si oui, vous pouvez lancer le
              recalibrage annuel pour mettre a jour le profil agronomique.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CalendarClock className="h-4 w-4 text-gray-500" />
          {isLoading ? (
            <span>Verification de la date de recolte...</span>
          ) : (
            <span>
              Date de recolte detectee: <span className="font-medium">{formatDate(eligibility?.harvest_date)}</span>
            </span>
          )}
        </div>
        {eligibility?.days_since_harvest != null && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {eligibility.days_since_harvest} jour(s) depuis la fin de recolte.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button type="button"  onClick={onProceed}>
          Oui, recolte terminee - Lancer le recalibrage
        </Button>

        <Button type="button" variant="outline" onClick={() => void onSnooze(7)}>
          Non, pas encore terminee
        </Button>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
          <label htmlFor="annual-custom-snooze" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Rappeler dans X jours
          </label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="annual-custom-snooze"
              type="number"
              min={1}
              max={180}
              value={customDays}
              onChange={(event) => setCustomDays(Number(event.target.value || 1))}
              className="w-28"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void onSnooze(Math.max(1, customDays))}
            >
              <Clock3 className="h-4 w-4" />
              Programmer le rappel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

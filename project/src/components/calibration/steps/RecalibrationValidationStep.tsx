import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecalibrationValidationStepProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  onValidate: () => void;
  onCancel: () => void;
  onFullRecalibration: () => void;
}

export function RecalibrationValidationStep({
  canSubmit,
  isSubmitting,
  onValidate,
  onCancel,
  onFullRecalibration,
}: RecalibrationValidationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Validation finale</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Confirmez les changements pour lancer le recalibrage partiel, annulez, ou basculez vers un recalibrage complet.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4">
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>Endpoint cible: <code>POST /parcels/:id/calibration/partial</code></p>
          <p>Le systeme recalculera uniquement les modules impactes apres validation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button variant="blue" type="button" onClick={onValidate} disabled={!canSubmit || isSubmitting} className="w-full" >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isSubmitting ? 'Validation...' : 'Valider le recalibrage partiel'}</span>
        </Button>

        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          <XCircle className="h-4 w-4" />
          <span>Annuler</span>
        </Button>

        <Button type="button" variant="outline" onClick={onFullRecalibration} className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20">
          <RotateCcw className="h-4 w-4" />
          <span>Lancer un recalibrage complet</span>
        </Button>
      </div>
    </div>
  );
}

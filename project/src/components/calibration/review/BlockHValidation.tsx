import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { calibrationApi } from '@/lib/api/calibration-output';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/query-keys';
import { CheckCircle, Pause } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BlockHValidationProps {
  parcelId: string;
  calibrationId: string;
}

export function BlockHValidation({ parcelId, calibrationId }: BlockHValidationProps) {
  const { t } = useTranslation('ai');
  const { currentOrganization } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await calibrationApi.validateCalibration(
        parcelId,
        calibrationId,
        currentOrganization?.id,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.calibration.review(parcelId, currentOrganization?.id) });
      toast.success(t('calibrationReview.blockH.validateSuccess', 'Baseline valid\u00e9e avec succ\u00e8s'));
      router.history.back();
    } catch {
      toast.error(t('calibrationReview.blockH.validateError', '\u00c9chec de la validation'));
    } finally {
      setIsValidating(false);
      setShowConfirm(false);
    }
  };

  const handleSaveForLater = () => {
    toast.success(t('calibrationReview.blockH.savedForLater', 'Baseline sauvegard\u00e9e'));
    router.history.back();
  };

  return (
    <>
      <div
        className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex items-center justify-center gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        data-block="H"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mr-4 hidden md:block">
          {t('calibrationReview.blockH.prompt', 'Ce calibrage vous semble-t-il refl\u00e9ter votre parcelle ?')}
        </p>
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={isValidating}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {t('calibrationReview.blockH.validate', 'Valider la baseline')}
        </Button>
        <Button
          variant="outline"
          onClick={handleSaveForLater}
          disabled={isValidating}
          className="gap-2"
        >
          <Pause className="h-4 w-4" />
          {t('calibrationReview.blockH.saveLater', 'Sauvegarder et compl\u00e9ter plus tard')}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('calibrationReview.blockH.confirmTitle', 'Confirmer la validation')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'calibrationReview.blockH.confirmDescription',
                'Confirmer la validation de la baseline ? Cette action active les diagnostics IA pour votre parcelle.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isValidating}>
              {t('common.cancel', 'Annuler')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleValidate} disabled={isValidating}>
              {isValidating
                ? t('common.loading', 'Chargement...')
                : t('calibrationReview.blockH.confirmValidate', 'Confirmer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

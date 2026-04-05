import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Zap, Key, AlertTriangle } from 'lucide-react';

interface AiQuotaExceededModalProps {
  open: boolean;
  onClose: () => void;
  limit?: number;
  used?: number;
  resetDate?: string;
}

export function AiQuotaExceededModal({
  open,
  onClose,
  limit,
  used,
  resetDate,
}: AiQuotaExceededModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formattedResetDate = resetDate
    ? new Date(resetDate).toLocaleDateString()
    : '';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {t('ai.quota.exceeded', 'AI Quota Exceeded')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'ai.quota.exceededDescription',
              "You've used all {{used}} of your {{limit}} AI requests this month. Your quota resets on {{resetDate}}.",
              { used, limit, resetDate: formattedResetDate },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => {
              onClose();
              navigate({ to: '/settings/subscription' });
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            {t('ai.quota.upgradeAction', 'Upgrade Plan')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              navigate({ to: '/settings/ai' });
            }}
          >
            <Key className="w-4 h-4 mr-2" />
            {t('ai.quota.byokAction', 'Add Your Own Key')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to detect AI_QUOTA_EXCEEDED errors from mutations and trigger the modal.
 */
export function useAiQuotaError() {
  const [quotaError, setQuotaError] = useState<{
    open: boolean;
    limit?: number;
    used?: number;
    resetDate?: string;
  }>({ open: false });

  const handleError = (error: unknown) => {
    const data = typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { data?: Record<string, unknown> } }).response?.data || error
      : error;
    if (data?.error === 'AI_QUOTA_EXCEEDED' || data?.message?.includes?.('AI quota exceeded')) {
      setQuotaError({
        open: true,
        limit: data.limit,
        used: data.used,
        resetDate: data.resetDate,
      });
      return true; // Error was handled
    }
    return false; // Not a quota error
  };

  const closeModal = () => setQuotaError({ open: false });

  return { quotaError, handleError, closeModal };
}

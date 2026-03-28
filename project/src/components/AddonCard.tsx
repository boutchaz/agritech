import React, { useState } from 'react';
import { Check, Plus, Loader2, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseAddon, useCancelAddon } from '../hooks/useAddons';
import type { AddonModule, OrganizationAddon } from '../lib/api/addons';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type ConfirmAction = {
  title: string;
  description?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
};

interface AddonCardProps {
  addon: AddonModule;
  activeAddon?: OrganizationAddon;
  hasAvailableSlots: boolean;
  onPurchaseSuccess?: () => void;
}

const AddonCard: React.FC<AddonCardProps> = ({
  addon,
  activeAddon,
  hasAvailableSlots,
  onPurchaseSuccess,
}) => {
  const purchaseAddon = usePurchaseAddon();
  const cancelAddon = useCancelAddon();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>({ title: '', onConfirm: () => {} });
  const showConfirm = (title: string, onConfirm: () => void, opts?: { description?: string; variant?: 'destructive' | 'default' }) => {
    setConfirmAction({ title, onConfirm, ...opts });
    setConfirmOpen(true);
  };

  const isActive = activeAddon?.status === 'active' || activeAddon?.status === 'trialing';
  const isCanceling = activeAddon?.cancel_at_period_end;

  const handlePurchase = async () => {
    if (!hasAvailableSlots) {
      toast.error('Aucun emplacement addon disponible. Veuillez mettre à niveau votre plan.');
      return;
    }

    try {
      const result = await purchaseAddon.mutateAsync({
        module_id: addon.id,
        success_url: window.location.href,
      });

      if (result.checkout_url) {
        if (result.addon_id) {
          toast.success('Addon activé avec succès!');
          onPurchaseSuccess?.();
        } else {
          window.location.href = result.checkout_url;
        }
      }
    } catch (error) {
      toast.error('Erreur lors de l\'achat de l\'addon');
      console.error('Purchase error:', error);
    }
  };

  const handleCancel = async (immediately: boolean) => {
    const confirmMessage = immediately
      ? 'Êtes-vous sûr de vouloir annuler immédiatement? Vous perdrez l\'accès à ce module.'
      : 'L\'addon sera annulé à la fin de la période de facturation. Continuer?';

    showConfirm(confirmMessage, async () => {
      try {
        await cancelAddon.mutateAsync({
          module_id: addon.id,
          cancel_immediately: immediately,
        });
        toast.success(
          immediately
            ? 'Addon annulé avec succès'
            : 'L\'addon sera annulé à la fin de la période'
        );
      } catch (error) {
        toast.error('Erreur lors de l\'annulation de l\'addon');
        console.error('Cancel error:', error);
      }
    }, {variant: "destructive"});
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      className={`relative rounded-xl border-2 p-5 transition-all ${
        isActive
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      {isActive && (
        <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-1.5">
          <Check className="h-4 w-4" />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {addon.name}
          </h4>
          {addon.category && (
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {addon.category}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 min-h-[40px]">
          {addon.description || 'Module supplémentaire pour votre organisation'}
        </p>

        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {addon.addon_price_monthly ? `$${addon.addon_price_monthly}` : 'Gratuit'}
          </span>
          {addon.addon_price_monthly && (
            <span className="text-sm text-gray-500 dark:text-gray-400">/mois</span>
          )}
        </div>

        {isActive && activeAddon && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {isCanceling ? 'Expire le: ' : 'Renouvellement: '}
                {formatDate(activeAddon.current_period_end)}
              </span>
            </div>

            {isCanceling ? (
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                Annulation programmée
              </div>
            ) : (
              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => handleCancel(false)}
                  disabled={cancelAddon.isPending}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Annuler à la fin
                </Button>
                <Button
                  onClick={() => handleCancel(true)}
                  disabled={cancelAddon.isPending}
                  className="px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {cancelAddon.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {!isActive && (
          <Button
            onClick={handlePurchase}
            disabled={purchaseAddon.isPending || !hasAvailableSlots}
            className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              hasAvailableSlots
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {purchaseAddon.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span>
                  {hasAvailableSlots ? 'Ajouter à mon plan' : 'Aucun emplacement disponible'}
                </span>
              </>
            )}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default AddonCard;

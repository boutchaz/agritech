import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { useFarms } from '@/hooks/useMultiTenantData';
import { useParcels } from '@/hooks/useParcels';
import { useCreateLabServiceOrder } from '@/hooks/useLabServices';
import { toast } from 'sonner';

const orderSchema = z.object({
  farm_id: z.string().uuid('Sélectionnez une ferme'),
  parcel_id: z.string().uuid('Sélectionnez une parcelle').optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderLabServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: any | null;
}

export function OrderLabServiceDialog({ isOpen, onClose, service }: OrderLabServiceDialogProps) {
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');

  const { data: farms } = useFarms();
  const { data: parcels } = useParcels(selectedFarmId);
  const createOrder = useCreateLabServiceOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const farmId = watch('farm_id');

  // Update selected farm when form value changes
  if (farmId && farmId !== selectedFarmId) {
    setSelectedFarmId(farmId);
  }

  const onSubmit = async (data: OrderFormData) => {
    if (!service) return;

    try {
      await createOrder.mutateAsync({
        service_type_id: service.id,
        provider_id: service.provider_id,
        farm_id: data.farm_id,
        parcel_id: data.parcel_id || null,
        quoted_price: service.price,
        currency: service.currency || 'MAD',
        notes: data.notes,
        status: 'pending',
      });

      toast.success('Commande créée avec succès');
      reset();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande');
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commander: {service.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Service Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Prix:</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {service.price?.toFixed(2)} {service.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Délai:</span>
              <span>{service.turnaround_days} jours</span>
            </div>
            {service.parameters_tested && service.parameters_tested.length > 0 && (
              <div>
                <span className="font-medium">Paramètres:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {service.parameters_tested.map((param: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600"
                    >
                      {param}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Farm Selection */}
          <FormField
            label="Ferme *"
            error={errors.farm_id?.message}
            htmlFor="farm_id"
          >
            <NativeSelect id="farm_id" {...register('farm_id')} error={!!errors.farm_id}>
              <option value="">Sélectionnez une ferme</option>
              {farms?.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {/* Parcel Selection */}
          {selectedFarmId && (
            <FormField
              label="Parcelle (optionnel)"
              error={errors.parcel_id?.message}
              htmlFor="parcel_id"
            >
              <NativeSelect id="parcel_id" {...register('parcel_id')} error={!!errors.parcel_id}>
                <option value="">Sélectionnez une parcelle</option>
                {parcels?.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          )}

          {/* Sample Requirements */}
          {service.sample_requirements && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Instructions de prélèvement
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{service.sample_requirements}</p>
            </div>
          )}

          {/* Notes */}
          <FormField label="Notes" error={errors.notes?.message} htmlFor="notes">
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notes ou instructions particulières..."
              rows={3}
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Création...' : 'Créer la commande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

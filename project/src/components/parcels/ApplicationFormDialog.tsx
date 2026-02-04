import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { FlaskRound, Calendar, Droplets } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

const schema = z.object({
  product_id: z.string().uuid(),
  farm_id: z.string().uuid(),
  parcel_id: z.string().uuid().optional(),
  application_date: z.string(),
  quantity_used: z.number().positive(),
  area_treated: z.number().positive(),
  cost: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  task_id: z.string().uuid().optional(),
});

type FormData = z.infer<typeof schema>;

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelId?: string;
  farmId: string;
  onSuccess?: () => void;
}

export const ApplicationFormDialog: React.FC<ApplicationFormDialogProps> = ({
  open,
  onOpenChange,
  parcelId,
  farmId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_id: farmId,
      parcel_id: parcelId,
      application_date: new Date().toISOString().split('T')[0],
      currency: currentOrganization?.currency || 'MAD',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/v1/product-applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'x-organization-id': currentOrganization?.id || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create application');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate parcel applications query
      queryClient.invalidateQueries({ queryKey: ['parcels', parcelId, 'applications'] });
      // Also invalidate general applications list
      queryClient.invalidateQueries({ queryKey: ['product-applications'] });

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  // Fetch available products
  const { data: products } = useQuery({
    queryKey: ['available-products'],
    queryFn: async () => {
      const response = await fetch(`/api/v1/product-applications/available-products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'x-organization-id': currentOrganization?.id || '',
        },
      });
      const data = await response.json();
      return data.products || [];
    },
    enabled: open,
  }).data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskRound className="h-5 w-5 text-green-600" />
            {t('parcels.index.addApplication')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id">{t('parcels.index.product')}</Label>
            <Select
              {...form.register('product_id')}
              onValueChange={(value) => form.setValue('product_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('parcels.index.selectProduct')} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.quantity} {product.unit} {t('parcels.index.available')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Application Date */}
          <div className="space-y-2">
            <Label htmlFor="application_date">
              <Calendar className="h-4 w-4 mr-2 inline" />
              {t('parcels.index.applicationDate')}
            </Label>
            <Input
              id="application_date"
              type="date"
              {...form.register('application_date')}
            />
          </div>

          {/* Quantity and Area */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_used">{t('parcels.index.quantityUsed')}</Label>
              <Input
                id="quantity_used"
                type="number"
                step="1"
                {...form.register('quantity_used')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_treated">
                <Droplets className="h-4 w-4 mr-2 inline" />
                {t('parcels.index.areaTreated')} (ha)
              </Label>
              <Input
                id="area_treated"
                type="number"
                step="0.01"
                {...form.register('area_treated')}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">{t('parcels.index.cost')} ({currentOrganization?.currency || 'MAD'})</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              {...form.register('cost')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('parcels.index.notes')}</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t('parcels.index.notesPlaceholder')}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !form.formState.isValid}
            >
              {mutation.isPending ? t('parcels.index.saving') : t('parcels.index.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

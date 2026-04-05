import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import { useCreatePayment, useUpdatePayment, type Payment, type CreatePaymentInput } from '@/hooks/useAccountingPayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Loader2 } from 'lucide-react';
import { getLocalDate } from '@/utils/date';

const getPaymentSchema = (t: (key: string) => string) => z.object({
  payment_type: z.enum(['receive', 'pay']),
  party_type: z.enum(['customer', 'supplier']).nullable().optional(),
  party_id: z.string().nullable().optional(),
  party_name: z.string().min(1, t('payments.form.validation.partyNameRequired')),
  payment_date: z.string().min(1, t('payments.form.validation.paymentDateRequired')),
  amount: z.coerce.number().min(0.01, t('payments.form.validation.amountMin')),
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'mobile_money']),
  bank_account_id: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
  status: z.enum(['draft', 'submitted', 'cancelled']).optional(),
  remarks: z.string().nullable().optional(),
});

type PaymentFormData = z.infer<ReturnType<typeof getPaymentSchema>>;

interface PaymentFormProps {
  payment?: Payment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentForm = ({ payment, onSuccess, onCancel }: PaymentFormProps) => {
  const { t } = useTranslation('accounting');
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(getPaymentSchema(t)),
    defaultValues: payment ? {
      payment_type: payment.payment_type as 'receive' | 'pay',
      party_type: payment.party_type as 'customer' | 'supplier' | null,
      party_id: payment.party_id,
      party_name: payment.party_name,
      payment_date: payment.payment_date,
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
      bank_account_id: payment.bank_account_id,
      reference_number: payment.reference_number,
      status: payment.status || 'draft',
      remarks: payment.remarks,
    } : {
      payment_type: 'receive',
      payment_date: getLocalDate(),
      amount: 0,
      payment_method: 'bank_transfer',
      status: 'draft',
      party_name: '',
    },
  });

  const watchPaymentType = form.watch('payment_type');
  const watchPartyId = form.watch('party_id');

  // Auto-fill party name when party is selected
  React.useEffect(() => {
    if (watchPartyId) {
      const parties = watchPaymentType === 'receive' ? customers : suppliers;
      const party = parties.find((p) => p.id === watchPartyId);
      if (party) {
        form.setValue('party_name', party.name);
        form.setValue('party_type', watchPaymentType === 'receive' ? 'customer' : 'supplier');
      }
    }
  }, [watchPartyId, watchPaymentType, customers, suppliers, form]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      if (payment) {
        await updatePayment.mutateAsync({ id: payment.id, ...data });
      } else {
        await createPayment.mutateAsync(data as CreatePaymentInput);
      }
      onSuccess?.();
    } catch (error) {
      console.error(t('payments.form.errors.saveFailed'), error);
    }
  };

  const isLoading = createPayment.isPending || updatePayment.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment Type */}
        <div>
          <Label htmlFor="payment_type">{t('payments.form.fields.paymentType')}</Label>
          <NativeSelect
            id="payment_type"
            {...form.register('payment_type')}
            disabled={!!payment}
          >
            <option value="receive">{t('payments.form.paymentTypes.received')}</option>
            <option value="pay">{t('payments.form.paymentTypes.made')}</option>
          </NativeSelect>
          {form.formState.errors.payment_type && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.payment_type.message}</p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <Label htmlFor="payment_date">{t('payments.form.fields.paymentDate')}</Label>
          <Input
            id="payment_date"
            type="date"
            {...form.register('payment_date')}
          />
          {form.formState.errors.payment_date && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.payment_date.message}</p>
          )}
        </div>
      </div>

      {/* Party Selection */}
      <div>
        <Label htmlFor="party_id">
          {watchPaymentType === 'receive' ? t('payments.form.fields.customer') : t('payments.form.fields.supplier')} ({t('payments.form.fields.optional')})
        </Label>
        <NativeSelect
          id="party_id"
          {...form.register('party_id')}
        >
          <option value="">-- {t('payments.form.actions.select')} {watchPaymentType === 'receive' ? t('payments.form.fields.customer') : t('payments.form.fields.supplier')} --</option>
          {(watchPaymentType === 'receive' ? customers : suppliers).map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Party Name (manual entry if no party selected) */}
      <div>
        <Label htmlFor="party_name">{t('payments.form.fields.partyName')}</Label>
        <Input
          id="party_name"
          {...form.register('party_name')}
          placeholder={`${t('payments.form.actions.enter')} ${watchPaymentType === 'receive' ? t('payments.form.fields.customer').toLowerCase() : t('payments.form.fields.supplier').toLowerCase()} ${t('payments.form.fields.name').toLowerCase()}`}
          disabled={!!watchPartyId}
        />
        {form.formState.errors.party_name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.party_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <Label htmlFor="amount">{t('payments.form.fields.amount')} (MAD)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...form.register('amount')}
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <Label htmlFor="payment_method">{t('payments.form.fields.paymentMethod')}</Label>
          <NativeSelect
            id="payment_method"
            {...form.register('payment_method')}
          >
            <option value="cash">{t('payments.form.methods.cash')}</option>
            <option value="bank_transfer">{t('payments.form.methods.bankTransfer')}</option>
            <option value="check">{t('payments.form.methods.check')}</option>
            <option value="mobile_money">{t('payments.form.methods.mobileMoney')}</option>
          </NativeSelect>
          {form.formState.errors.payment_method && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.payment_method.message}</p>
          )}
        </div>
      </div>

      {/* Reference Number */}
      <div>
        <Label htmlFor="reference_number">{t('payments.form.fields.referenceNumber')} ({t('payments.form.fields.optional')})</Label>
        <Input
          id="reference_number"
          {...form.register('reference_number')}
          placeholder={t('payments.form.placeholders.referenceNumber')}
        />
      </div>

      {/* Remarks */}
      <div>
        <Label htmlFor="remarks">{t('payments.form.fields.remarks')} ({t('payments.form.fields.optional')})</Label>
        <Textarea
          id="remarks"
          {...form.register('remarks')}
          placeholder={t('payments.form.placeholders.remarks')}
          rows={3}
        />
      </div>

      {/* Status (for editing only) */}
      {payment && (
        <div>
          <Label htmlFor="status">{t('payments.form.fields.status')}</Label>
          <NativeSelect
            id="status"
            {...form.register('status')}
          >
            <option value="draft">{t('payments.form.statuses.draft')}</option>
            <option value="submitted">{t('payments.form.statuses.submitted')}</option>
            <option value="cancelled">{t('payments.form.statuses.cancelled')}</option>
          </NativeSelect>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('payments.form.buttons.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {payment ? t('payments.form.buttons.update') : t('payments.form.buttons.create')}
        </Button>
      </div>
    </form>
  );
};

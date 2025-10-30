import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import { useCreatePayment, useUpdatePayment, type Payment, type CreatePaymentInput } from '@/hooks/useAccountingPayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Loader2 } from 'lucide-react';

const paymentSchema = z.object({
  payment_type: z.enum(['received', 'paid']),
  party_type: z.enum(['Customer', 'Supplier']).nullable().optional(),
  party_id: z.string().nullable().optional(),
  party_name: z.string().min(1, 'Party name is required'),
  payment_date: z.string().min(1, 'Payment date is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'mobile_money']),
  bank_account_id: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
  status: z.enum(['draft', 'submitted', 'cancelled']).optional(),
  remarks: z.string().nullable().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: Payment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ payment, onSuccess, onCancel }) => {
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment ? {
      payment_type: payment.payment_type,
      party_type: payment.party_type as 'Customer' | 'Supplier' | null,
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
      payment_type: 'received',
      payment_date: new Date().toISOString().split('T')[0],
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
      const parties = watchPaymentType === 'received' ? customers : suppliers;
      const party = parties.find((p) => p.id === watchPartyId);
      if (party) {
        form.setValue('party_name', party.name);
        form.setValue('party_type', watchPaymentType === 'received' ? 'Customer' : 'Supplier');
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
      console.error('Failed to save payment:', error);
    }
  };

  const isLoading = createPayment.isPending || updatePayment.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Payment Type */}
        <div>
          <Label htmlFor="payment_type">Payment Type</Label>
          <NativeSelect
            id="payment_type"
            {...form.register('payment_type')}
            disabled={!!payment}
          >
            <option value="received">Payment Received</option>
            <option value="paid">Payment Made</option>
          </NativeSelect>
          {form.formState.errors.payment_type && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.payment_type.message}</p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <Label htmlFor="payment_date">Payment Date</Label>
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
          {watchPaymentType === 'received' ? 'Customer' : 'Supplier'} (Optional)
        </Label>
        <NativeSelect
          id="party_id"
          {...form.register('party_id')}
        >
          <option value="">-- Select {watchPaymentType === 'received' ? 'Customer' : 'Supplier'} --</option>
          {(watchPaymentType === 'received' ? customers : suppliers).map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Party Name (manual entry if no party selected) */}
      <div>
        <Label htmlFor="party_name">Party Name</Label>
        <Input
          id="party_name"
          {...form.register('party_name')}
          placeholder={`Enter ${watchPaymentType === 'received' ? 'customer' : 'supplier'} name`}
          disabled={!!watchPartyId}
        />
        {form.formState.errors.party_name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.party_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <Label htmlFor="amount">Amount (MAD)</Label>
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
          <Label htmlFor="payment_method">Payment Method</Label>
          <NativeSelect
            id="payment_method"
            {...form.register('payment_method')}
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="check">Check</option>
            <option value="mobile_money">Mobile Money</option>
          </NativeSelect>
          {form.formState.errors.payment_method && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.payment_method.message}</p>
          )}
        </div>
      </div>

      {/* Reference Number */}
      <div>
        <Label htmlFor="reference_number">Reference Number (Optional)</Label>
        <Input
          id="reference_number"
          {...form.register('reference_number')}
          placeholder="Check number, transaction ID, etc."
        />
      </div>

      {/* Remarks */}
      <div>
        <Label htmlFor="remarks">Remarks (Optional)</Label>
        <Textarea
          id="remarks"
          {...form.register('remarks')}
          placeholder="Additional notes about this payment"
          rows={3}
        />
      </div>

      {/* Status (for editing only) */}
      {payment && (
        <div>
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            {...form.register('status')}
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="cancelled">Cancelled</option>
          </NativeSelect>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {payment ? 'Update Payment' : 'Create Payment'}
        </Button>
      </div>
    </form>
  );
};

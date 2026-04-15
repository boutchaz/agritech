import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentRecords, useApprovePayment, useCreatePaymentRecord, useProcessPayment } from '@/hooks/usePaymentRecords';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { DollarSign, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentMethod } from '@/types/payments';

function PaymentsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [processTarget, setProcessTarget] = useState<string | null>(null);
  const [processMethod, setProcessMethod] = useState<PaymentMethod>('cash');

  const { data: payments = [], isLoading, isError } = usePaymentRecords();
  const approveMutation = useApprovePayment();
  const createPayment = useCreatePaymentRecord();
  const processMutation = useProcessPayment();

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');
    const optionalNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number().optional(),
    );
    const requiredNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number(),
    );

    return z.object({
      worker_id: z.string().min(1, requiredMessage),
      payment_type: z.enum(['daily_wage', 'monthly_salary', 'metayage_share', 'bonus', 'overtime', 'advance']),
      payment_method: z.union([z.literal(''), z.enum(['cash', 'bank_transfer', 'check', 'mobile_money'])]),
      period_start: z.string().min(1, requiredMessage),
      period_end: z.string().min(1, requiredMessage),
      base_amount: requiredNumber,
      days_worked: optionalNumber,
      hours_worked: optionalNumber,
      notes: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      worker_id: '',
      payment_type: 'daily_wage',
      payment_method: '',
      period_start: '',
      period_end: '',
      base_amount: undefined,
      days_worked: undefined,
      hours_worked: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: SubmitData) => {
    try {
      await createPayment.mutateAsync({
        worker_id: data.worker_id,
        payment_type: data.payment_type,
        payment_method: data.payment_method || undefined,
        period_start: data.period_start,
        period_end: data.period_end,
        base_amount: data.base_amount,
        days_worked: data.days_worked,
        hours_worked: data.hours_worked,
        notes: data.notes || undefined,
      });
      toast.success(t('payments.createSuccess', 'Payment record created successfully'));
      setShowForm(false);
      form.reset();
    } catch {
      toast.error(t('payments.createError', 'Failed to create payment record'));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      await approveMutation.mutateAsync({ paymentId });
      toast.success(t('payments.approveSuccess', 'Payment approved'));
    } catch {
      toast.error(t('payments.approveError', 'Failed to approve payment'));
    }
  };

  const handleProcess = async (paymentId: string, paymentMethod: PaymentMethod) => {
    try {
      await processMutation.mutateAsync({
        paymentId,
        data: { payment_method: paymentMethod },
      });
      toast.success(t('payments.processSuccess', 'Payment processed'));
      setProcessTarget(null);
    } catch {
      toast.error(t('payments.processError', 'Failed to process payment'));
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: DollarSign, label: t('payments.pageTitle', 'Payment Records'), isActive: true },
        ]}
        title={t('payments.pageTitle', 'Payment Records')}
        subtitle={t('payments.description', 'Track worker payments, advances, and approvals.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('payments.newPayment', 'New Payment')}
          </Button>
        }
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-48" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('payments.noPayments', 'No payment records yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('payments.noPaymentsDescription', 'Payment records will appear here once created.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('payments.newPayment', 'New Payment')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {payment.worker_name || t('payments.unnamedWorker', 'Worker')}
                    </CardTitle>
                    {payment.status && (
                      <Badge className={getStatusColor(payment.status)}>
                        {t(`payments.status.${payment.status}`, payment.status)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {payment.payment_type && (
                      <p><span className="font-medium">{t('payments.type', 'Type')}:</span> {t(`payments.types.${payment.payment_type}`, payment.payment_type)}</p>
                    )}
                    {payment.period_start && (
                      <p><span className="font-medium">{t('payments.period', 'Period')}:</span> {format(new Date(payment.period_start), 'dd MMM')} - {payment.period_end ? format(new Date(payment.period_end), 'dd MMM yyyy') : t('common.ongoing', '...')}</p>
                    )}
                    {payment.net_amount !== undefined && payment.net_amount !== null && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(payment.net_amount).toLocaleString()} {t('common.mad', 'MAD')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    {payment.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(payment.id)}>
                        {t('payments.approve', 'Approve')}
                      </Button>
                    )}
                    {payment.status === 'approved' && (
                      <Button variant="outline" size="sm" onClick={() => { setProcessTarget(payment.id); setProcessMethod('cash'); }}>
                        {t('payments.process', 'Process')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('payments.newPayment', 'New Payment')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="payment-worker-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payments.workerId', 'Worker ID')}
                </label>
                <Input
                  id="payment-worker-id"
                  {...form.register('worker_id')}
                  placeholder={t('payments.workerIdPlaceholder', 'Enter worker ID')}
                  className={form.formState.errors.worker_id ? 'border-red-400' : ''}
                />
                {form.formState.errors.worker_id && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.worker_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.type', 'Payment Type')}
                  </label>
                  <NativeSelect id="payment-type" {...form.register('payment_type')}>
                    <option value="daily_wage">{t('payments.types.dailyWage', 'Daily Wage')}</option>
                    <option value="monthly_salary">{t('payments.types.monthlySalary', 'Monthly Salary')}</option>
                    <option value="metayage_share">{t('payments.types.metayageShare', 'Métayage Share')}</option>
                    <option value="bonus">{t('payments.types.bonus', 'Bonus')}</option>
                    <option value="overtime">{t('payments.types.overtime', 'Overtime')}</option>
                    <option value="advance">{t('payments.types.advance', 'Advance')}</option>
                  </NativeSelect>
                </div>

                <div>
                  <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.paymentMethod', 'Payment Method')}
                  </label>
                  <NativeSelect id="payment-method" {...form.register('payment_method')}>
                    <option value="">{t('common.selectOption', 'Select an option')}</option>
                    <option value="cash">{t('payments.methods.cash', 'Cash')}</option>
                    <option value="bank_transfer">{t('payments.methods.bankTransfer', 'Bank Transfer')}</option>
                    <option value="check">{t('payments.methods.check', 'Check')}</option>
                    <option value="mobile_money">{t('payments.methods.mobileMoney', 'Mobile Money')}</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment-period-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.periodStart', 'Period Start')}
                  </label>
                  <Input
                    id="payment-period-start"
                    {...form.register('period_start')}
                    type="date"
                    className={form.formState.errors.period_start ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.period_start && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.period_start.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="payment-period-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.periodEnd', 'Period End')}
                  </label>
                  <Input
                    id="payment-period-end"
                    {...form.register('period_end')}
                    type="date"
                    className={form.formState.errors.period_end ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.period_end && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.period_end.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="payment-base-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.baseAmount', 'Base Amount')}
                  </label>
                  <Input
                    id="payment-base-amount"
                    {...form.register('base_amount')}
                    type="number"
                    step="0.01"
                    placeholder={t('payments.baseAmountPlaceholder', 'Enter amount')}
                    className={form.formState.errors.base_amount ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.base_amount && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.base_amount.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="payment-days-worked" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.daysWorked', 'Days Worked')}
                  </label>
                  <Input
                    id="payment-days-worked"
                    {...form.register('days_worked')}
                    type="number"
                    step="1"
                    placeholder={t('payments.daysWorkedPlaceholder', 'Days')}
                  />
                </div>

                <div>
                  <label htmlFor="payment-hours-worked" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('payments.hoursWorked', 'Hours Worked')}
                  </label>
                  <Input
                    id="payment-hours-worked"
                    {...form.register('hours_worked')}
                    type="number"
                    step="0.5"
                    placeholder={t('payments.hoursWorkedPlaceholder', 'Hours')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="payment-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payments.notes', 'Notes')}
                </label>
                <Textarea
                  id="payment-notes"
                  {...form.register('notes')}
                  placeholder={t('payments.notesPlaceholder', 'Add payment notes')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    form.reset();
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="green" disabled={createPayment.isPending}>
                  {createPayment.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {processTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">{t('payments.selectMethod', 'Select Payment Method')}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="process-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payments.paymentMethod', 'Payment Method')}
                </label>
                <NativeSelect
                  id="process-method"
                  value={processMethod}
                  onChange={(e) => setProcessMethod(e.target.value as PaymentMethod)}
                >
                  <option value="cash">{t('payments.methods.cash', 'Cash')}</option>
                  <option value="bank_transfer">{t('payments.methods.bank_transfer', 'Bank Transfer')}</option>
                  <option value="check">{t('payments.methods.check', 'Check')}</option>
                  <option value="mobile_money">{t('payments.methods.mobile_money', 'Mobile Money')}</option>
                </NativeSelect>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setProcessTarget(null)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  variant="green"
                  disabled={processMutation.isPending}
                  onClick={() => handleProcess(processTarget, processMethod)}
                >
                  {processMutation.isPending ? t('payments.processing', 'Processing...') : t('payments.process', 'Process')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/payments')({
  component: withRouteProtection(PaymentsPage, 'read', 'Payment'),
});

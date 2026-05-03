import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  useExchangeRates,
  useCreateExchangeRate,
  useUpdateExchangeRate,
  useDeleteExchangeRate,
} from '@/hooks/useExchangeRates';
import type { ExchangeRate } from '@/lib/api/exchange-rates';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ArrowLeftRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

function ExchangeRatesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ExchangeRate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: rates = [], isLoading, isError } = useExchangeRates(orgId);
  const createRate = useCreateExchangeRate(orgId);
  const updateRate = useUpdateExchangeRate(orgId);
  const deleteRate = useDeleteExchangeRate(orgId);

  const schema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');
    return z.object({
      rate_date: z.string().min(1, requiredMessage),
      from_currency: z.string().length(3, t('validation.currencyCode', 'Use a 3-letter currency code')),
      to_currency: z.string().length(3, t('validation.currencyCode', 'Use a 3-letter currency code')),
      rate: z.coerce.number().positive(t('validation.positiveNumber', 'Must be positive')),
      source: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof schema>;
  type SubmitData = z.output<typeof schema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rate_date: new Date().toISOString().split('T')[0],
      from_currency: 'EUR',
      to_currency: 'MAD',
      rate: 0,
      source: 'manual',
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    form.reset({
      rate_date: new Date().toISOString().split('T')[0],
      from_currency: 'EUR',
      to_currency: 'MAD',
      rate: 0,
      source: 'manual',
    });
    setShowForm(true);
  };

  const openEdit = (r: ExchangeRate) => {
    setEditTarget(r);
    form.reset({
      rate_date: r.rate_date,
      from_currency: r.from_currency,
      to_currency: r.to_currency,
      rate: Number(r.rate),
      source: r.source || 'manual',
    });
    setShowForm(true);
  };

  const onSubmit = async (data: SubmitData) => {
    try {
      if (editTarget) {
        await updateRate.mutateAsync({
          id: editTarget.id,
          data: {
            rate_date: data.rate_date,
            from_currency: data.from_currency.toUpperCase(),
            to_currency: data.to_currency.toUpperCase(),
            rate: data.rate,
            source: data.source || 'manual',
          },
        });
        toast.success(t('exchangeRates.updateSuccess', 'Exchange rate updated'));
      } else {
        await createRate.mutateAsync({
          rate_date: data.rate_date,
          from_currency: data.from_currency.toUpperCase(),
          to_currency: data.to_currency.toUpperCase(),
          rate: data.rate,
          source: data.source || 'manual',
        });
        toast.success(t('exchangeRates.createSuccess', 'Exchange rate created'));
      }
      setShowForm(false);
      setEditTarget(null);
      form.reset();
    } catch (e: any) {
      toast.error(e?.message || t('exchangeRates.saveError', 'Failed to save exchange rate'));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRate.mutateAsync(deleteTarget);
      toast.success(t('exchangeRates.deleteSuccess', 'Exchange rate deleted'));
    } catch {
      toast.error(t('exchangeRates.deleteError', 'Failed to delete exchange rate'));
    }
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t('exchangeRates.title', 'Exchange Rates')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'exchangeRates.subtitle',
                'Manage FX rates used for multi-currency journal entries and revaluation.',
              )}
            </p>
          </div>
          <Button variant="green" onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('exchangeRates.addRate', 'Add Rate')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('exchangeRates.recentRates', 'Recent rates')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <PageLoader />
              </div>
            ) : isError ? (
              <p className="text-sm text-red-500">
                {t('common.error', 'An error occurred while loading data.')}
              </p>
            ) : rates.length === 0 ? (
              <div className="text-center py-12">
                <ArrowLeftRight className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('exchangeRates.noRates', 'No exchange rates yet.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exchangeRates.date', 'Date')}</TableHead>
                      <TableHead>{t('exchangeRates.from', 'From')}</TableHead>
                      <TableHead>{t('exchangeRates.to', 'To')}</TableHead>
                      <TableHead className="text-right">{t('exchangeRates.rate', 'Rate')}</TableHead>
                      <TableHead>{t('exchangeRates.source', 'Source')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.rate_date}</TableCell>
                        <TableCell className="font-medium">{r.from_currency}</TableCell>
                        <TableCell className="font-medium">{r.to_currency}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.rate).toLocaleString('fr-FR', {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 8,
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {r.source}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              {editTarget
                ? t('exchangeRates.editRate', 'Edit Exchange Rate')
                : t('exchangeRates.addRate', 'Add Exchange Rate')}
            </h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="er-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exchangeRates.date', 'Rate Date')}
                </label>
                <Input
                  id="er-date"
                  type="date"
                  {...form.register('rate_date')}
                  className={form.formState.errors.rate_date ? 'border-red-400' : ''}
                />
                {form.formState.errors.rate_date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.rate_date.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="er-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('exchangeRates.from', 'From')}
                  </label>
                  <Input
                    id="er-from"
                    maxLength={3}
                    {...form.register('from_currency')}
                    placeholder="EUR"
                    className={form.formState.errors.from_currency ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.from_currency && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.from_currency.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="er-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('exchangeRates.to', 'To')}
                  </label>
                  <Input
                    id="er-to"
                    maxLength={3}
                    {...form.register('to_currency')}
                    placeholder="MAD"
                    className={form.formState.errors.to_currency ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.to_currency && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.to_currency.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="er-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exchangeRates.rate', 'Rate')}
                </label>
                <Input
                  id="er-rate"
                  type="number"
                  step="0.00000001"
                  {...form.register('rate')}
                  placeholder="10.85"
                  className={form.formState.errors.rate ? 'border-red-400' : ''}
                />
                {form.formState.errors.rate && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.rate.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="er-source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exchangeRates.source', 'Source')}
                </label>
                <Input
                  id="er-source"
                  {...form.register('source')}
                  placeholder="manual"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditTarget(null);
                    form.reset();
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="green"
                  disabled={createRate.isPending || updateRate.isPending}
                >
                  {(createRate.isPending || updateRate.isPending)
                    ? t('common.saving', 'Saving...')
                    : editTarget
                      ? t('common.update', 'Update')
                      : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('exchangeRates.confirmDelete', 'Delete Exchange Rate')}
        description={t(
          'exchangeRates.confirmDeleteDescription',
          'Are you sure you want to delete this exchange rate?',
        )}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/exchange-rates')({
  component: withRouteProtection(ExchangeRatesPage, 'read', 'JournalEntry'),
});

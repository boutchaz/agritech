import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentRecords, useApprovePayment, useCreatePaymentRecord, useProcessPayment } from '@/hooks/usePaymentRecords';
import { useWorkers } from '@/hooks/useWorkers';
import type { PaymentMethod } from '@/types/payments';
import { PageLoader, SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  ListPageLayout,
  ListPageHeader,
  FilterBar,
  ResponsiveList,
  DataTablePagination,
  useServerTableState,
} from '@/components/ui/data-table';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Users, Clock, CheckCircle2 } from 'lucide-react';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
import { format } from 'date-fns';
import { toast } from 'sonner';

function PaymentsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id || null;

  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processTarget, setProcessTarget] = useState<string | null>(null);
  const [processMethod, setProcessMethod] = useState<PaymentMethod | ''>('');

  const { data: payments = [], isLoading, isError } = usePaymentRecords();
  const { data: workers = [] } = useWorkers(organizationId);
  const workersArray = Array.isArray(workers) ? workers : [];
  const approveMutation = useApprovePayment();
  const processMutation = useProcessPayment();

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'period_start', direction: 'desc' },
  });

  const filtered = useMemo(() => {
    let result = [...payments];
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }
    if (tableState.search) {
      const q = tableState.search.toLowerCase();
      result = result.filter(
        (p) => p.worker_name?.toLowerCase().includes(q) || p.payment_type?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [payments, filterStatus, tableState.search]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / tableState.pageSize);
  const paginatedItems = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return filtered.slice(start, start + tableState.pageSize);
  }, [filtered, tableState.page, tableState.pageSize]);

  const stats = useMemo(() => {
    if (!payments.length) return null;
    const pending = payments.filter((p) => p.status === 'pending').length;
    const paid = payments.filter((p) => p.status === 'paid').length;
    const totalAmount = payments.reduce((s, p) => s + (Number(p.net_amount) || 0), 0);
    return { total: payments.length, pending, paid, totalAmount: totalAmount.toLocaleString() };
  }, [payments]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      await approveMutation.mutateAsync({ paymentId });
      toast.success(t('payments.approveSuccess', 'Paiement approuvé'));
    } catch {
      toast.error(t('payments.approveError', 'Échec de l\'approbation'));
    }
  };

  const handleProcess = async (paymentId: string, method: PaymentMethod) => {
    try {
      await processMutation.mutateAsync({ paymentId, data: { payment_method: method } });
      toast.success(t('payments.processSuccess', 'Paiement traité'));
      setProcessTarget(null);
    } catch {
      toast.error(t('payments.processError', 'Échec du traitement'));
    }
  };

  if (!currentOrganization) return <PageLoader />;

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <Button variant="green" onClick={() => setShowForm(true)} className="w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('payments.newPayment', 'Nouveau paiement')}
                </Button>
              }
            />
          }
          stats={stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('payments.stats.total', 'Total paiements')}</CardTitle>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('payments.stats.pending', 'En attente')}</CardTitle>
                  <Clock className="w-4 h-4 text-yellow-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('payments.stats.paid', 'Payés')}</CardTitle>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.paid}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('payments.stats.totalAmount', 'Montant total')}</CardTitle>
                  <Users className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totalAmount} MAD</div></CardContent>
              </Card>
            </div>
          ) : undefined}
          filters={
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <div className="space-y-3">
                <FilterBar
                  searchValue={tableState.search}
                  onSearchChange={tableState.setSearch}
                  searchPlaceholder={t('payments.search', 'Rechercher par travailleur, type...')}
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payments.allStatuses', 'Tous les statuts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('payments.allStatuses', 'Tous les statuts')}</SelectItem>
                    <SelectItem value="pending">{t('payments.status.pending', 'En attente')}</SelectItem>
                    <SelectItem value="approved">{t('payments.status.approved', 'Approuvé')}</SelectItem>
                    <SelectItem value="paid">{t('payments.status.paid', 'Payé')}</SelectItem>
                    <SelectItem value="cancelled">{t('payments.status.cancelled', 'Annulé')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
          pagination={totalItems > tableState.pageSize ? (
            <DataTablePagination
              page={tableState.page}
              pageSize={tableState.pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
            />
          ) : undefined}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            {isLoading ? (
              <SectionLoader />
            ) : isError ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                variant="card"
                icon={DollarSign}
                title={tableState.search ? t('payments.noResults', 'Aucun résultat') : t('payments.noPayments', 'Aucun paiement enregistré')}
                description={tableState.search
                  ? t('payments.noResultsDescription', 'Essayez d\'ajuster vos critères.')
                  : t('payments.noPaymentsDescription', 'Les paiements des travailleurs apparaîtront ici.')}
                action={!tableState.search ? { label: t('payments.newPayment', 'Nouveau paiement'), onClick: () => setShowForm(true) } : undefined}
              />
            ) : (
              <ResponsiveList
                items={paginatedItems}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyIcon={DollarSign}
                emptyTitle=""
                emptyMessage=""
                className="p-3 lg:p-0"
                renderCard={(payment) => (
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{payment.worker_name || t('payments.unnamedWorker', 'Travailleur')}</p>
                        <p className="text-xs text-gray-500">{t(`payments.types.${payment.payment_type}`, payment.payment_type)}</p>
                      </div>
                      {payment.status && <Badge className={getStatusColor(payment.status)}>{t(`payments.status.${payment.status}`, payment.status)}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t('payments.period', 'Période')}</p>
                        <p className="font-medium">
                          {payment.period_start ? format(new Date(payment.period_start), 'dd MMM') : t('common.notAvailable', '—')}
                          {payment.period_end ? ` - ${format(new Date(payment.period_end), 'dd MMM')}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('payments.amount', 'Montant')}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{Number(payment.net_amount || 0).toLocaleString()} MAD</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {payment.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleApprove(payment.id)}>
                          {t('payments.approve', 'Approuver')}
                        </Button>
                      )}
                      {payment.status === 'approved' && (
                        <Button variant="outline" size="sm" onClick={() => { setProcessTarget(payment.id); setProcessMethod(''); }}>
                          {t('payments.process', 'Traiter')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                renderTableHeader={
                  <TableRow>
                    <TableHead>{t('payments.worker', 'Travailleur')}</TableHead>
                    <TableHead>{t('payments.type', 'Type')}</TableHead>
                    <TableHead>{t('payments.period', 'Période')}</TableHead>
                    <TableHead>{t('payments.amount', 'Montant')}</TableHead>
                    <TableHead>{t('payments.status.label', 'Statut')}</TableHead>
                    <TableHead>{t('common.actionsColumn', 'Actions')}</TableHead>
                  </TableRow>
                }
                renderTable={(payment) => (
                  <>
                    <TableCell className="font-medium">{payment.worker_name || t('common.notAvailable', '—')}</TableCell>
                    <TableCell>{t(`payments.types.${payment.payment_type}`, payment.payment_type)}</TableCell>
                    <TableCell>
                      {payment.period_start ? format(new Date(payment.period_start), 'dd/MM/yyyy') : t('common.notAvailable', '—')}
                      {payment.period_end ? ` → ${format(new Date(payment.period_end), 'dd/MM/yyyy')}` : ''}
                    </TableCell>
                    <TableCell className="font-bold">{Number(payment.net_amount || 0).toLocaleString()} MAD</TableCell>
                    <TableCell>
                      {payment.status && <Badge className={getStatusColor(payment.status)}>{t(`payments.status.${payment.status}`, payment.status)}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleApprove(payment.id)}>
                            {t('payments.approve', 'Approuver')}
                          </Button>
                        )}
                        {payment.status === 'approved' && (
                          <Button variant="outline" size="sm" onClick={() => { setProcessTarget(payment.id); setProcessMethod(''); }}>
                            {t('payments.process', 'Traiter')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}
              />
            )}
          </div>
        </ListPageLayout>
      </div>

      {/* Create Payment Dialog */}
      <PaymentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        workers={workersArray}
      />

      {/* Process Payment Dialog */}
      {processTarget && (
        <ResponsiveDialog
          open={!!processTarget}
          onOpenChange={(open) => { if (!open) setProcessTarget(null); }}
          title={t('payments.selectMethod', 'Méthode de paiement')}
          size="sm"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setProcessTarget(null)}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button
                type="button"
                variant="green"
                disabled={processMutation.isPending || !processMethod}
                onClick={() => { if (processMethod) handleProcess(processTarget, processMethod); }}
              >
                {processMutation.isPending ? t('payments.processing', 'Traitement...') : t('payments.process', 'Traiter')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Label>{t('payments.paymentMethod', 'Méthode de paiement')}</Label>
            <NativeSelect value={processMethod} onChange={(e) => setProcessMethod(e.target.value as PaymentMethod | '')}>
              <option value="" disabled>{t('payments.selectMethodPlaceholder', '-- Select method --')}</option>
              <option value="cash">{t('payments.methods.cash', 'Espèces')}</option>
              <option value="bank_transfer">{t('payments.methods.bankTransfer', 'Virement bancaire')}</option>
              <option value="check">{t('payments.methods.check', 'Chèque')}</option>
              <option value="mobile_money">{t('payments.methods.mobileMoney', 'Mobile Money')}</option>
            </NativeSelect>
          </div>
        </ResponsiveDialog>
      )}
    </>
  );
}

// ── Payment Form Dialog ──

function PaymentFormDialog({
  open,
  onOpenChange,
  workers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: { id: string; first_name: string; last_name: string }[];
}) {
  const { t } = useTranslation();
  const createPayment = useCreatePaymentRecord();

  const schema = useMemo(() => z.object({
    worker_id: z.string().min(1, t('validation.required', 'Requis')),
    payment_type: z.enum(['daily_wage', 'monthly_salary', 'metayage_share', 'bonus', 'overtime', 'advance']),
    payment_method: z.union([z.literal(''), z.enum(['cash', 'bank_transfer', 'check', 'mobile_money'])]),
    period_start: z.string().min(1, t('validation.required', 'Requis')),
    period_end: z.string().min(1, t('validation.required', 'Requis')),
    base_amount: z.coerce.number(),
    days_worked: z.coerce.number().optional(),
    hours_worked: z.coerce.number().optional(),
    notes: z.string().optional(),
  }), [t]);

  type FormData = z.input<typeof schema>;
  type SubmitData = z.output<typeof schema>;

  const form = useForm<FormData, unknown, SubmitData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      worker_id: '', payment_type: 'daily_wage', payment_method: '',
      period_start: '', period_end: '', base_amount: undefined,
      days_worked: undefined, hours_worked: undefined, notes: '',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
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
      toast.success(t('payments.createSuccess', 'Paiement créé avec succès'));
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(t('payments.createError', 'Échec de la création du paiement'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('payments.newPayment', 'Nouveau paiement')}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button type="submit" form="payment-form" variant="green" disabled={createPayment.isPending}>
            {createPayment.isPending ? t('common.creating', 'Création...') : t('common.create', 'Créer')}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('payments.worker', 'Travailleur')} *</Label>
          <Select value={form.watch('worker_id')} onValueChange={(v) => { form.setValue('worker_id', v); form.trigger('worker_id'); }}>
            <SelectTrigger className={form.formState.errors.worker_id ? 'border-red-400' : ''}>
              <SelectValue placeholder={t('payments.selectWorker', 'Sélectionner un travailleur')} />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.worker_id && <p className="text-sm text-red-500">{form.formState.errors.worker_id.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('payments.type', 'Type de paiement')}</Label>
            <NativeSelect {...form.register('payment_type')}>
              <option value="daily_wage">{t('payments.types.dailyWage', 'Journalier')}</option>
              <option value="monthly_salary">{t('payments.types.monthlySalary', 'Salaire mensuel')}</option>
              <option value="metayage_share">{t('payments.types.metayageShare', 'Part métayage')}</option>
              <option value="bonus">{t('payments.types.bonus', 'Prime')}</option>
              <option value="overtime">{t('payments.types.overtime', 'Heures sup.')}</option>
              <option value="advance">{t('payments.types.advance', 'Avance')}</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label>{t('payments.paymentMethod', 'Méthode')}</Label>
            <NativeSelect {...form.register('payment_method')}>
              <option value="">{t('common.selectOption', 'Choisir...')}</option>
              <option value="cash">{t('payments.methods.cash', 'Espèces')}</option>
              <option value="bank_transfer">{t('payments.methods.bankTransfer', 'Virement')}</option>
              <option value="check">{t('payments.methods.check', 'Chèque')}</option>
              <option value="mobile_money">{t('payments.methods.mobileMoney', 'Mobile Money')}</option>
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('payments.periodStart', 'Début période')} *</Label>
            <Input {...form.register('period_start')} type="date" className={form.formState.errors.period_start ? 'border-red-400' : ''} />
          </div>
          <div className="space-y-2">
            <Label>{t('payments.periodEnd', 'Fin période')} *</Label>
            <Input {...form.register('period_end')} type="date" className={form.formState.errors.period_end ? 'border-red-400' : ''} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('payments.baseAmount', 'Montant de base')} *</Label>
            <Input {...form.register('base_amount')} type="number" step="0.01" placeholder={t('common.enterAmount', '0.00')} className={form.formState.errors.base_amount ? 'border-red-400' : ''} />
          </div>
          <div className="space-y-2">
            <Label>{t('payments.daysWorked', 'Jours travaillés')}</Label>
            <Input {...form.register('days_worked')} type="number" step="1" placeholder={t('common.enterNumber', '0')} />
          </div>
          <div className="space-y-2">
            <Label>{t('payments.hoursWorked', 'Heures travaillées')}</Label>
            <Input {...form.register('hours_worked')} type="number" step="0.5" placeholder={t('common.enterNumber', '0')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('payments.notes', 'Notes')}</Label>
          <Textarea {...form.register('notes')} placeholder={t('payments.notesPlaceholder', 'Observations...')} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/payments')({
  component: withLicensedRouteProtection(PaymentsPage, 'read', 'Payment'),
});

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useCreateStockAccountMapping,
  useDeleteStockAccountMapping,
  useInitDefaultStockAccountMappings,
  useStockAccountMappings,
  useStockGlReconciliation,
  useUpdateStockAccountMapping,
} from '@/hooks/useOpeningStock';
import type {
  StockAccountMapping,
  StockEntryTypeForAccounting,
} from '@/types/opening-stock';
import { STOCK_ENTRY_TYPES_FOR_MAPPING } from '@/types/opening-stock';
import { cn } from '@/lib/utils';

type AccountOption = {
  id: string;
  code: string;
  name: string;
  is_group?: boolean;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(n);

const mappingSchema = z.object({
  entry_type: z.enum([
    'Material Receipt',
    'Material Issue',
    'Stock Transfer',
    'Stock Reconciliation',
    'Opening Stock',
  ]),
  debit_account_id: z.string().min(1, 'Required'),
  credit_account_id: z.string().min(1, 'Required'),
  item_category: z.string().optional(),
});
type MappingFormData = z.infer<typeof mappingSchema>;

export function StockAccountingManagement() {
  const { t } = useTranslation('common');
  const { data: mappings = [], isLoading: mappingsLoading } = useStockAccountMappings();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: reconciliation, isLoading: reconLoading } = useStockGlReconciliation();
  const createMutation = useCreateStockAccountMapping();
  const updateMutation = useUpdateStockAccountMapping();
  const deleteMutation = useDeleteStockAccountMapping();
  const initMutation = useInitDefaultStockAccountMappings();

  const [editing, setEditing] = useState<StockAccountMapping | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const form = useForm<MappingFormData>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      entry_type: 'Material Receipt',
      debit_account_id: '',
      credit_account_id: '',
      item_category: '',
    },
  });

  const accountOptions = useMemo<AccountOption[]>(
    () =>
      ((accounts ?? []) as AccountOption[])
        .filter((a) => !a.is_group)
        .sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    [accounts],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      entry_type: 'Material Receipt',
      debit_account_id: '',
      credit_account_id: '',
      item_category: '',
    });
    setShowDialog(true);
  };

  const openEdit = (m: StockAccountMapping) => {
    setEditing(m);
    form.reset({
      entry_type: m.entry_type,
      debit_account_id: m.debit_account_id,
      credit_account_id: m.credit_account_id,
      item_category: m.item_category || '',
    });
    setShowDialog(true);
  };

  const onSubmit = async (data: MappingFormData) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            debit_account_id: data.debit_account_id,
            credit_account_id: data.credit_account_id,
            item_category: data.item_category || undefined,
          },
        });
        toast.success(t('stockAccounting.toast.updated', 'Mapping updated'));
      } else {
        await createMutation.mutateAsync({
          entry_type: data.entry_type,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          item_category: data.item_category || undefined,
        });
        toast.success(t('stockAccounting.toast.created', 'Mapping created'));
      }
      setShowDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(`${t('stockAccounting.toast.error', 'Failed')}: ${message}`);
    }
  };

  const onDelete = async (m: StockAccountMapping) => {
    if (!confirm(t('stockAccounting.confirmDelete', 'Delete this mapping?'))) return;
    try {
      await deleteMutation.mutateAsync(m.id);
      toast.success(t('stockAccounting.toast.deleted', 'Mapping deleted'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(`${t('stockAccounting.toast.deleteError', 'Failed to delete')}: ${message}`);
    }
  };

  const onInitDefaults = async () => {
    try {
      const result = await initMutation.mutateAsync();
      toast.success(
        t('stockAccounting.toast.initDone', `${result.created} default mapping(s) created`, {
          count: result.created,
        }),
      );
      if (result.skipped.length > 0) {
        for (const s of result.skipped) {
          toast.info(`${s.entry_type}: ${s.reason}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(`${t('stockAccounting.toast.initError', 'Init failed')}: ${message}`);
    }
  };

  const driftStatus = reconciliation?.drift_status;
  const driftBadge =
    driftStatus === 'balanced'
      ? { variant: 'default' as const, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: t('stockAccounting.recon.balanced', 'Balanced') }
      : driftStatus === 'no_mappings'
      ? { variant: 'destructive' as const, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: t('stockAccounting.recon.noMappings', 'No mappings configured') }
      : { variant: 'destructive' as const, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: t('stockAccounting.recon.drift', 'Drift detected') };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('stockAccounting.title', 'Stock Accounting')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'stockAccounting.subtitle',
            'Configure how stock entries hit the chart of accounts and monitor stock vs GL drift.',
          )}
        </p>
      </div>

      {/* Reconciliation card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {driftStatus === 'balanced' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                {t('stockAccounting.recon.title', 'Stock vs GL reconciliation')}
              </CardTitle>
              <CardDescription>
                {t(
                  'stockAccounting.recon.description',
                  'Compares physical stock value against the inventory account GL balance.',
                )}
              </CardDescription>
            </div>
            {driftStatus && (
              <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', driftBadge.color)}>
                {driftBadge.label}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reconLoading ? (
            <div className="text-sm text-muted-foreground">
              {t('common.loading', 'Loading…')}
            </div>
          ) : reconciliation ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('stockAccounting.recon.physical', 'Physical value')}
                </div>
                <div className="text-2xl font-semibold mt-1">
                  {formatMoney(reconciliation.physical_value)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('stockAccounting.recon.gl', 'GL balance')}
                </div>
                <div className="text-2xl font-semibold mt-1">
                  {formatMoney(reconciliation.gl_balance)}
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-4',
                  Math.abs(reconciliation.drift) > 0.01 && 'border-amber-300 dark:border-amber-700',
                )}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('stockAccounting.recon.drift', 'Drift')}
                </div>
                <div
                  className={cn(
                    'text-2xl font-semibold mt-1',
                    Math.abs(reconciliation.drift) > 0.01
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {formatMoney(reconciliation.drift)}
                </div>
              </div>
            </div>
          ) : null}

          {reconciliation && reconciliation.inventory_accounts.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">
                {t('stockAccounting.recon.accounts', 'Inventory accounts')}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('stockAccounting.account.code', 'Code')}</TableHead>
                    <TableHead>{t('stockAccounting.account.name', 'Name')}</TableHead>
                    <TableHead className="text-right">
                      {t('stockAccounting.account.debit', 'Debit')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('stockAccounting.account.credit', 'Credit')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('stockAccounting.account.balance', 'Balance')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliation.inventory_accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono">{acc.code}</TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell className="text-right">{formatMoney(acc.debit)}</TableCell>
                      <TableCell className="text-right">{formatMoney(acc.credit)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(acc.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mappings card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>
                {t('stockAccounting.mappings.title', 'Account mappings')}
              </CardTitle>
              <CardDescription>
                {t(
                  'stockAccounting.mappings.description',
                  'Each stock entry type posts to one debit + one credit account. Stock Transfer is intentionally unmapped (no GL impact).',
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {mappings.length === 0 && (
                <Button
                  variant="outline"
                  onClick={onInitDefaults}
                  disabled={initMutation.isPending}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {initMutation.isPending
                    ? t('stockAccounting.mappings.initing', 'Seeding…')
                    : t('stockAccounting.mappings.initDefaults', 'Seed defaults (CGNC)')}
                </Button>
              )}
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('stockAccounting.mappings.add', 'Add mapping')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading', 'Loading…')}</div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed text-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <h3 className="font-medium mb-1">
                {t('stockAccounting.mappings.empty.title', 'No account mappings yet')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t(
                  'stockAccounting.mappings.empty.body',
                  'Until mappings are configured, posting a stock entry will not produce journal entries — your GL will silently drift from physical stock.',
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('stockAccounting.mappings.entryType', 'Entry type')}</TableHead>
                  <TableHead>{t('stockAccounting.mappings.debit', 'Debit account')}</TableHead>
                  <TableHead>{t('stockAccounting.mappings.credit', 'Credit account')}</TableHead>
                  <TableHead>{t('stockAccounting.mappings.category', 'Item category')}</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant="secondary">{m.entry_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.debit_account ? (
                        <span className="text-sm">
                          <span className="font-mono">{m.debit_account.code}</span>{' '}
                          — {m.debit_account.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{m.debit_account_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.credit_account ? (
                        <span className="text-sm">
                          <span className="font-mono">{m.credit_account.code}</span>{' '}
                          — {m.credit_account.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{m.credit_account_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.item_category ? (
                        <span className="text-sm">{m.item_category}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('stockAccounting.mappings.allItems', 'All items')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(m)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('stockAccounting.dialog.editTitle', 'Edit mapping')
                : t('stockAccounting.dialog.createTitle', 'Add mapping')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'stockAccounting.dialog.description',
                'Choose which accounts each entry type posts against.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} id="mapping-form" className="space-y-4">
            <div>
              <Label htmlFor="entry_type">
                {t('stockAccounting.dialog.entryType', 'Entry type')}
              </Label>
              <Select
                value={form.watch('entry_type')}
                onValueChange={(v) => form.setValue('entry_type', v as StockEntryTypeForAccounting)}
                disabled={!!editing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_ENTRY_TYPES_FOR_MAPPING.filter((opt) => opt.value !== 'Stock Transfer').map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="debit_account_id">
                {t('stockAccounting.dialog.debit', 'Debit account')}
              </Label>
              <Select
                value={form.watch('debit_account_id')}
                onValueChange={(v) => form.setValue('debit_account_id', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      accountsLoading
                        ? t('common.loading', 'Loading…')
                        : t('stockAccounting.dialog.pickAccount', 'Select account')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono mr-2">{a.code}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.debit_account_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.debit_account_id.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="credit_account_id">
                {t('stockAccounting.dialog.credit', 'Credit account')}
              </Label>
              <Select
                value={form.watch('credit_account_id')}
                onValueChange={(v) => form.setValue('credit_account_id', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      accountsLoading
                        ? t('common.loading', 'Loading…')
                        : t('stockAccounting.dialog.pickAccount', 'Select account')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono mr-2">{a.code}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.credit_account_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.credit_account_id.message}
                </p>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="mapping-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 mr-2',
                  (createMutation.isPending || updateMutation.isPending) && 'animate-spin',
                )}
              />
              {editing
                ? t('common.save', 'Save')
                : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Edit2,
  Loader2,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FilterBar,
  ListPageHeader,
  ListPageLayout,
} from '@/components/ui/data-table';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import {
  useAllTaxes,
  useCreateTax,
  useDeleteTax,
  useUpdateTax,
} from '@/hooks/useTaxes';
import type { Tax } from '@/lib/api/taxes';

type TaxType = 'sales' | 'purchase' | 'both';

const taxSchema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().optional(),
  rate: z.coerce.number().min(0).max(100),
  tax_type: z.enum(['sales', 'purchase', 'both']),
  is_compound: z.boolean().optional().default(false),
  is_withholding: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  description: z.string().optional(),
});
type TaxFormValues = z.input<typeof taxSchema>;
type TaxFormData = z.output<typeof taxSchema>;

function TaxesPage() {
  const { t } = useTranslation('accounting');
  const { data: taxes = [], isLoading } = useAllTaxes();
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();
  const deleteTax = useDeleteTax();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TaxType | 'all'>('all');
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Tax | null>(null);

  const form = useForm<TaxFormValues, unknown, TaxFormData>({
    resolver: zodResolver(taxSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      rate: 0,
      tax_type: 'sales',
      is_compound: false,
      is_withholding: false,
      is_active: true,
      description: '',
    },
  });

  const filteredTaxes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return taxes.filter((tax) => {
      const matchesType = typeFilter === 'all' || tax.tax_type === typeFilter;
      if (!matchesType) return false;
      if (!term) return true;
      return [tax.name, tax.code, tax.description]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [taxes, search, typeFilter]);

  const openCreate = () => {
    setEditingTax(null);
    form.reset({
      name: '',
      code: '',
      rate: 0,
      tax_type: 'sales',
      is_compound: false,
      is_withholding: false,
      is_active: true,
      description: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (tax: Tax) => {
    setEditingTax(tax);
    form.reset({
      name: tax.name ?? '',
      code: tax.code ?? '',
      rate: Number(tax.rate ?? 0),
      tax_type: (tax.tax_type as TaxType) ?? 'sales',
      is_compound: tax.is_compound ?? false,
      is_withholding: tax.is_withholding ?? false,
      is_active: tax.is_active ?? true,
      description: tax.description ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: TaxFormData) => {
    try {
      if (editingTax) {
        await updateTax.mutateAsync({ id: editingTax.id, updates: data });
        toast.success(t('taxes.updated', 'Tax updated'));
      } else {
        await createTax.mutateAsync(data);
        toast.success(t('taxes.created', 'Tax created'));
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? t('taxes.saveError', 'Failed to save tax'));
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteTax.mutateAsync(deleteCandidate.id);
      toast.success(t('taxes.deleted', 'Tax deleted'));
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err?.message ?? t('taxes.deleteError', 'Failed to delete tax'));
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      purchase:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      both: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return (
      <Badge className={map[type] ?? ''}>
        {t(`taxes.type.${type}`, type)}
      </Badge>
    );
  };

  return (
    <ListPageLayout
      header={
        <ListPageHeader
          title={t('taxes.title', 'Taxes')}
          subtitle={t(
            'taxes.description',
            'Manage VAT, withholding tax (RAS) and other tax codes used on quotes, invoices and purchase orders.',
          )}
          actions={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('taxes.create', 'New tax')}
            </Button>
          }
        />
      }
      filters={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('taxes.search', 'Search taxes...')}
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TaxType | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('taxes.filterByType', 'Filter by type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('taxes.allTypes', 'All types')}</SelectItem>
              <SelectItem value="sales">{t('taxes.type.sales', 'Sales')}</SelectItem>
              <SelectItem value="purchase">
                {t('taxes.type.purchase', 'Purchase')}
              </SelectItem>
              <SelectItem value="both">{t('taxes.type.both', 'Both')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTaxes.length === 0 ? (
            <EmptyState
              icon={Percent}
              title={t('taxes.empty.title', 'No taxes yet')}
              description={t(
                'taxes.empty.description',
                'Add VAT codes, withholding taxes or any custom tax used in your invoices.',
              )}
              action={{
                label: t('taxes.create', 'New tax'),
                onClick: openCreate,
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taxes.col.code', 'Code')}</TableHead>
                  <TableHead>{t('taxes.col.name', 'Name')}</TableHead>
                  <TableHead className="text-right">
                    {t('taxes.col.rate', 'Rate')}
                  </TableHead>
                  <TableHead>{t('taxes.col.type', 'Type')}</TableHead>
                  <TableHead className="text-center">
                    {t('taxes.col.flags', 'Flags')}
                  </TableHead>
                  <TableHead className="text-center">
                    {t('common.statusColumn', 'Status')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('common.actionsColumn', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-mono text-sm">
                      {tax.code || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{tax.name}</div>
                      {tax.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {tax.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(tax.rate ?? 0).toFixed(2)}%
                    </TableCell>
                    <TableCell>{typeBadge(tax.tax_type as string)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {tax.is_compound && (
                          <Badge variant="outline">
                            {t('taxes.flags.compound', 'Compound')}
                          </Badge>
                        )}
                        {tax.is_withholding && (
                          <Badge variant="outline">
                            {t('taxes.flags.withholding', 'WHT/RAS')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          tax.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }
                      >
                        {tax.is_active
                          ? t('common.active', 'Active')
                          : t('common.inactive', 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(tax)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCandidate(tax)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          editingTax
            ? t('taxes.editTitle', 'Edit tax')
            : t('taxes.createTitle', 'New tax')
        }
        description={t(
          'taxes.formDescription',
          'Used on invoice/quote/purchase order line items.',
        )}
        size="lg"
      >
        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tax-name">
                {t('taxes.fields.name', 'Name')} *
              </Label>
              <Input
                id="tax-name"
                {...form.register('name')}
                placeholder="TVA 20%"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-code">
                {t('taxes.fields.code', 'Code')}
              </Label>
              <Input
                id="tax-code"
                {...form.register('code')}
                placeholder="TVA20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-rate">
                {t('taxes.fields.rate', 'Rate (%)')} *
              </Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...form.register('rate', { valueAsNumber: true })}
              />
              {form.formState.errors.rate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.rate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t('taxes.fields.type', 'Tax type')} *</Label>
              <Select
                value={form.watch('tax_type')}
                onValueChange={(v) => form.setValue('tax_type', v as TaxType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">
                    {t('taxes.type.sales', 'Sales')}
                  </SelectItem>
                  <SelectItem value="purchase">
                    {t('taxes.type.purchase', 'Purchase')}
                  </SelectItem>
                  <SelectItem value="both">
                    {t('taxes.type.both', 'Both')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tax-description">
              {t('taxes.fields.description', 'Description')}
            </Label>
            <Textarea
              id="tax-description"
              rows={2}
              {...form.register('description')}
            />
          </div>

          <div className="flex flex-wrap gap-6 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('is_compound')}
                onCheckedChange={(v) => form.setValue('is_compound', v)}
                id="tax-compound"
              />
              <Label htmlFor="tax-compound" className="text-sm">
                {t('taxes.flags.compound', 'Compound')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('is_withholding')}
                onCheckedChange={(v) => form.setValue('is_withholding', v)}
                id="tax-withholding"
              />
              <Label htmlFor="tax-withholding" className="text-sm">
                {t('taxes.flags.withholding', 'Withholding (RAS)')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(v) => form.setValue('is_active', v)}
                id="tax-active"
              />
              <Label htmlFor="tax-active" className="text-sm">
                {t('common.active', 'Active')}
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTax.isPending || updateTax.isPending}
            >
              {(createTax.isPending || updateTax.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingTax
                ? t('common.save', 'Save')
                : t('common.create', 'Create')}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('taxes.deleteTitle', 'Delete tax')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'taxes.deleteConfirm',
                'This action cannot be undone. The tax will be removed from your organization.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/taxes')({
  component: withRouteProtection(TaxesPage, 'read', 'Tax'),
});

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Barcode, Pencil, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/data-table';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateBarcode,
  useDeleteBarcode,
  useGenerateBarcode,
  useItemBarcodes,
  useRegenerateBarcode,
  useUpdateBarcode,
  useVariantBarcodes,
} from '@/hooks/useItemBarcodes';
import {
  BARCODE_TYPE_OPTIONS,
  type BarcodeType,
  type ItemBarcode,
} from '@/types/barcode';
import { BarcodeDisplay } from '@/components/Stock/BarcodeDisplay';
import { cn } from '@/lib/utils';

const barcodeFormSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
  barcode_type: z.string().optional(),
  is_primary: z.boolean().optional(),
});
type BarcodeFormData = z.infer<typeof barcodeFormSchema>;

interface Props {
  itemId?: string;
  variantId?: string;
}

export function ItemBarcodesManager({ itemId, variantId }: Props) {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const isVariant = !!variantId;
  const targetId = variantId || itemId || '';

  const itemBarcodesResult = useItemBarcodes(itemId || null);
  const variantBarcodesResult = useVariantBarcodes(variantId || null);
  const { data: barcodes = [], isLoading } = isVariant ? variantBarcodesResult : itemBarcodesResult;
  const createMutation = useCreateBarcode();
  const updateMutation = useUpdateBarcode();
  const deleteMutation = useDeleteBarcode();
  const generateMutation = useGenerateBarcode();
  const regenerateMutation = useRegenerateBarcode();

  const [editing, setEditing] = useState<ItemBarcode | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(barcodes.length / pageSize);
  const paginatedBarcodes = barcodes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [targetId]);

  const form = useForm<BarcodeFormData>({
    resolver: zodResolver(barcodeFormSchema),
    defaultValues: { barcode: '', barcode_type: '', is_primary: false },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      barcode: '',
      barcode_type: '',
      is_primary: barcodes.length === 0, // first barcode = primary by default
    });
    setShowDialog(true);
  };

  const openEdit = (b: ItemBarcode) => {
    setEditing(b);
    form.reset({
      barcode: b.barcode,
      barcode_type: b.barcode_type || '',
      is_primary: b.is_primary,
    });
    setShowDialog(true);
  };

  const onSubmit = async (data: BarcodeFormData) => {
    if (!currentOrganization?.id) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            barcode: data.barcode,
            barcode_type: (data.barcode_type as BarcodeType) || '',
            is_primary: data.is_primary,
          },
        });
        toast.success(t('barcode.toast.updated', 'Barcode updated'));
      } else {
        const payload = {
          organization_id: currentOrganization.id,
          item_id: itemId ?? '',
          barcode: data.barcode,
          barcode_type: (data.barcode_type as BarcodeType) || '',
          is_primary: data.is_primary,
        };
        if (isVariant) {
          Object.assign(payload, { variant_id: variantId! });
        }
        await createMutation.mutateAsync(payload);
        toast.success(t('barcode.toast.created', 'Barcode added'));
      }
      setShowDialog(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${t('barcode.toast.error', 'Failed')}: ${msg}`);
    }
  };

  const onDelete = async (b: ItemBarcode) => {
    if (!confirm(t('barcode.confirmDelete', 'Delete this barcode?'))) return;
    try {
      await deleteMutation.mutateAsync(b.id);
      toast.success(t('barcode.toast.deleted', 'Barcode deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${t('barcode.toast.deleteError', 'Failed to delete')}: ${msg}`);
    }
  };

  const onSetPrimary = async (b: ItemBarcode) => {
    try {
      await updateMutation.mutateAsync({
        id: b.id,
        data: { is_primary: true },
      });
      toast.success(t('barcode.toast.primarySet', 'Primary barcode updated'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${t('barcode.toast.primaryError', 'Failed')}: ${msg}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t(
            'barcode.subtitle',
            'Multiple barcodes per item. The primary is shown in lists; others are accepted by the scanner.',
          )}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('barcode.add', 'Add barcode')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4">{t('common.loading', 'Loading…')}</div>
      ) : barcodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed text-center">
          <Barcode className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('barcode.empty', 'No barcodes yet. Add one to enable scanning.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('barcode.cols.barcode', 'Barcode')}</TableHead>
                <TableHead>{t('barcode.cols.type', 'Type')}</TableHead>
                <TableHead>{t('barcode.cols.unit', 'UOM')}</TableHead>
                <TableHead>{t('barcode.cols.status', 'Status')}</TableHead>
                <TableHead className="w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBarcodes.map((b) => (
                <TableRow key={b.id} className={cn(!b.is_active && 'opacity-50')}>
                  <TableCell>
                    <BarcodeDisplay value={b.barcode} height={40} width={1.2} className="max-w-[180px]" />
                  </TableCell>
                  <TableCell>
                    {b.barcode_type ? (
                      <Badge variant="secondary">{b.barcode_type}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{b.unit_name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {b.is_primary && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300">
                          <Star className="w-3 h-3 mr-1" />
                          {t('barcode.primary', 'Primary')}
                        </Badge>
                      )}
                      {!b.is_active && (
                        <Badge variant="outline">{t('barcode.inactive', 'Inactive')}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!b.is_primary && b.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSetPrimary(b)}
                          title={t('barcode.setPrimary', 'Set as primary')}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(b)}
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
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalItems={barcodes.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <DialogTitle>
                  {editing
                    ? t('barcode.dialog.editTitle', 'Edit barcode')
                    : t('barcode.dialog.createTitle', 'Add barcode')}
                </DialogTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (editing) {
                      await regenerateMutation.mutateAsync(editing.id);
                      toast.success(t('barcode.toast.regenerated', 'Barcode regenerated'));
                    } else {
                      await generateMutation.mutateAsync(
                        isVariant ? { variant_id: variantId! } : { item_id: itemId! },
                      );
                      toast.success(t('barcode.toast.generated', 'EAN-13 barcode generated'));
                      setShowDialog(false);
                    }
                  }}
                  disabled={generateMutation.isPending || regenerateMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {editing
                    ? t('barcode.actions.regenerate', 'Regenerate')
                    : t('barcode.actions.generate', 'Generate EAN-13')}
                </Button>
              </div>
              <DialogDescription>
              {t(
                'barcode.dialog.description',
                'Each barcode must be unique within your organization.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form id="barcode-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="barcode">{t('barcode.dialog.barcode', 'Barcode value')}</Label>
                <Input
                  id="barcode"
                  type="text"
                  inputMode="numeric"
                  {...form.register('barcode')}
                  placeholder="e.g. 6111234567890"
                  autoFocus
                  className="mt-1 font-mono"
                />
              {form.formState.errors.barcode && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.barcode.message}
                </p>
              )}
              {form.watch('barcode') && form.watch('barcode').length >= 8 && (
                <div className="mt-2 flex justify-center p-3 bg-muted/50 rounded-lg border">
                  <BarcodeDisplay
                    value={form.watch('barcode')}
                    height={60}
                    width={1.5}
                    displayValue={true}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="barcode_type">{t('barcode.dialog.type', 'Type')}</Label>
              <Select
                value={form.watch('barcode_type') || ''}
                onValueChange={(v) => form.setValue('barcode_type', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'auto'} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.watch('is_primary') || false}
                onChange={(e) => form.setValue('is_primary', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>{t('barcode.dialog.isPrimary', 'Primary barcode')}</span>
            </label>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="barcode-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
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

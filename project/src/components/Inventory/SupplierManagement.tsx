import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { useAuth } from '@/hooks/useAuth';
import { useFormErrors } from '@/hooks/useFormErrors';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { FilterBar, ListPageLayout, ListPageHeader, ResponsiveList } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, Pencil, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Supplier } from '@/hooks/useSuppliers';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function SupplierManagement() {
  const { t } = useTranslation('stock');
  const { t: tCommon } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const { data: suppliers = [], isLoading, error, refetch } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const { handleFormError } = useFormErrors<SupplierFormData>();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const searchableFields = [
        supplier.name,
        supplier.contact_person,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.city,
        supplier.postal_code,
        supplier.country,
        supplier.website,
        supplier.tax_id,
        supplier.payment_terms,
        supplier.notes,
      ];

      return searchableFields.some((value) => value?.toLowerCase().includes(query));
    });
  }, [suppliers, searchTerm]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      website: '',
      tax_id: '',
      payment_terms: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (selectedSupplier) {
      reset({
        name: selectedSupplier.name || '',
        contact_person: selectedSupplier.contact_person || '',
        email: selectedSupplier.email || '',
        phone: selectedSupplier.phone || '',
        address: selectedSupplier.address || '',
        city: selectedSupplier.city || '',
        postal_code: selectedSupplier.postal_code || '',
        country: selectedSupplier.country || '',
        website: selectedSupplier.website || '',
        tax_id: selectedSupplier.tax_id || '',
        payment_terms: selectedSupplier.payment_terms || '',
        notes: selectedSupplier.notes || '',
      });
    } else {
      reset({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: '',
        website: '',
        tax_id: '',
        payment_terms: '',
        notes: '',
      });
    }
  }, [selectedSupplier, reset]);

  const handleCreate = () => {
    setSelectedSupplier(null);
    setShowForm(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSupplier.mutateAsync(supplierToDelete.id);
      toast.success(t('suppliers.deleted'));
      setShowDeleteDialog(false);
      setSupplierToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('suppliers.deleteFailed', { error: errorMessage }));
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (formData: SupplierFormData) => {
    if (!currentOrganization) {
      toast.error(t('suppliers.noOrganization'));
      return;
    }

    try {
      const cleanedData = {
        ...formData,
        contact_person: formData.contact_person?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        postal_code: formData.postal_code?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        website: formData.website?.trim() || undefined,
        tax_id: formData.tax_id?.trim() || undefined,
        payment_terms: formData.payment_terms?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      if (selectedSupplier) {
        await updateSupplier.mutateAsync({
          id: selectedSupplier.id,
          ...cleanedData,
        });
        toast.success(t('suppliers.updated'));
      } else {
        await createSupplier.mutateAsync({
          ...cleanedData,
          is_active: true,
        });
        toast.success(t('suppliers.created'));
      }

      setShowForm(false);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t(`suppliers.${selectedSupplier ? 'update' : 'create'}Failed`),
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {t('suppliers.noOrganization')}
        </p>
      </div>
    );
  }

  return (
    <>
    <ListPageLayout
      header={
        <ListPageHeader
          variant="shell"
          actions={
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('suppliers.create')}
            </Button>
          }
        />
      }
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('suppliers.searchPlaceholder', 'Search suppliers...')}
        />
      }
    >
      {error ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('suppliers.loadError', { error: error instanceof Error ? error.message : t('suppliers.unknownError') })}
          </p>
          <Button onClick={() => refetch()}>
            {tCommon('app.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <ResponsiveList
          items={filteredSuppliers}
          keyExtractor={(supplier) => supplier.id}
          emptyIcon={Building2}
          emptyTitle={
            suppliers.length === 0
              ? t('suppliers.noSuppliersTitle', 'No suppliers yet')
              : t('suppliers.noSearchResults', 'No suppliers found')
          }
          emptyMessage={
            suppliers.length === 0
              ? t('suppliers.noSuppliers')
              : t('suppliers.noSearchResultsDescription', 'Try adjusting your search.')
          }
          emptyAction={
            suppliers.length === 0
              ? {
                  label: t('suppliers.create'),
                  onClick: handleCreate,
                }
              : undefined
          }
          emptyExtra={
            suppliers.length > 0 && filteredSuppliers.length === 0 ? (
              <EmptyState
                variant="inline"
                description={t('suppliers.noSearchResultsDescription', 'Try adjusting your search.')}
              />
            ) : undefined
          }
          renderCard={(supplier) => (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{supplier.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {supplier.contact_person || '-'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(supplier)}
                    className="text-slate-700 dark:text-slate-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">{t('suppliers.email')}</span>
                  <span>{supplier.email || '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">{t('suppliers.phone')}</span>
                  <span>{supplier.phone || '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">{t('suppliers.city')}</span>
                  <span>{supplier.city || '-'}</span>
                </div>
              </div>
            </div>
          )}
          renderTableHeader={
            <tr>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.name')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.contact')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.email')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.phone')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.city')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.actions')}
              </TableHead>
            </tr>
          }
          renderTable={(supplier) => (
            <>
              <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                {supplier.name}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {supplier.contact_person || '-'}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {supplier.email || '-'}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {supplier.phone || '-'}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {supplier.city || '-'}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(supplier)}
                    className="text-slate-700 dark:text-slate-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </>
          )}
        />
      )}

      {/* Form Dialog */}
      <ResponsiveDialog
        open={showForm}
        onOpenChange={setShowForm}
        size="2xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? t('suppliers.edit') : t('suppliers.create')}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier ? t('suppliers.editDescription') : t('suppliers.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">{t('suppliers.name')} *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  invalid={!!errors.name}
                  placeholder={t('suppliers.namePlaceholder')}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contact_person">{t('suppliers.contactPerson')}</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                  invalid={!!errors.contact_person}
                  placeholder={t('suppliers.contactPersonPlaceholder')}
                />
                {errors.contact_person && (
                  <p className="text-red-600 text-sm mt-1">{errors.contact_person.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">{t('suppliers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  invalid={!!errors.email}
                  placeholder={t('suppliers.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">{t('suppliers.phone')}</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  invalid={!!errors.phone}
                  placeholder={t('suppliers.phonePlaceholder')}
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tax_id">{t('suppliers.taxId')}</Label>
                <Input
                  id="tax_id"
                  {...register('tax_id')}
                  invalid={!!errors.tax_id}
                  placeholder={t('suppliers.taxIdPlaceholder')}
                />
                {errors.tax_id && (
                  <p className="text-red-600 text-sm mt-1">{errors.tax_id.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">{t('suppliers.address')}</Label>
                <Input
                  id="address"
                  {...register('address')}
                  invalid={!!errors.address}
                  placeholder={t('suppliers.addressPlaceholder')}
                />
                {errors.address && (
                  <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">{t('suppliers.city')}</Label>
                <Input
                  id="city"
                  {...register('city')}
                  invalid={!!errors.city}
                  placeholder={t('suppliers.cityPlaceholder')}
                />
                {errors.city && (
                  <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="postal_code">{t('suppliers.postalCode')}</Label>
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  invalid={!!errors.postal_code}
                  placeholder={t('suppliers.postalCodePlaceholder')}
                />
                {errors.postal_code && (
                  <p className="text-red-600 text-sm mt-1">{errors.postal_code.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="country">{t('suppliers.country')}</Label>
                <Input
                  id="country"
                  {...register('country')}
                  invalid={!!errors.country}
                  placeholder={t('suppliers.countryPlaceholder')}
                />
                {errors.country && (
                  <p className="text-red-600 text-sm mt-1">{errors.country.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="website">{t('suppliers.website')}</Label>
                <Input
                  id="website"
                  type="url"
                  {...register('website')}
                  invalid={!!errors.website}
                  placeholder={t('suppliers.websitePlaceholder')}
                />
                {errors.website && (
                  <p className="text-red-600 text-sm mt-1">{errors.website.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="payment_terms">{t('suppliers.paymentTerms')}</Label>
                <Input
                  id="payment_terms"
                  {...register('payment_terms')}
                  invalid={!!errors.payment_terms}
                  placeholder={t('suppliers.paymentTermsPlaceholder')}
                />
                {errors.payment_terms && (
                  <p className="text-red-600 text-sm mt-1">{errors.payment_terms.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">{t('suppliers.notes')}</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.notes ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  rows={3}
                  placeholder={t('suppliers.notesPlaceholder')}
                />
                {errors.notes && (
                  <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                {tCommon('app.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedSupplier ? t('suppliers.updating') : t('suppliers.creating')}
                  </>
                ) : (
                  selectedSupplier ? t('suppliers.update') : t('suppliers.create')
                )}
              </Button>
            </div>
          </form>
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('suppliers.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('suppliers.deleteConfirmation')} <strong>"{supplierToDelete?.name}"</strong>?
              <br />
              <span className="text-red-600 dark:text-red-400">
                {t('suppliers.deleteWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('suppliers.deleting')}
                </>
              ) : (
                t('suppliers.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
    </>
  );
}

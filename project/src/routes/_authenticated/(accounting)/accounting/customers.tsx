import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { DialogFooter } from '@/components/ui/dialog';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type Customer,
} from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLoader } from '@/components/ui/loader';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useServerTableState, DataTablePagination, ListPageLayout, ListPageHeader, FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';


// Zod schema for customer form validation
const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  customer_code: z.string().optional(),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  credit_limit: z.string().optional(),
  customer_type: z.enum(['individual', 'business', 'government', 'other', '']).optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

function CustomersPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const tableState = useServerTableState({
    defaultPageSize: 12,
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      customer_code: '',
      contact_person: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'Morocco',
      website: '',
      tax_id: '',
      payment_terms: '',
      credit_limit: '',
      customer_type: '',
      notes: '',
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset({
        name: customer.name,
        customer_code: customer.customer_code || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        mobile: customer.mobile || '',
        address: customer.address || '',
        city: customer.city || '',
        state_province: customer.state_province || '',
        postal_code: customer.postal_code || '',
        country: customer.country || 'Morocco',
        website: customer.website || '',
        tax_id: customer.tax_id || '',
        payment_terms: customer.payment_terms || '',
        credit_limit: customer.credit_limit?.toString() || '',
        customer_type: (customer.customer_type || '') as '' | 'individual' | 'business' | 'government' | 'other',
        notes: customer.notes || '',
      });
    } else {
      setEditingCustomer(null);
      form.reset({
        name: '',
        customer_code: '',
        contact_person: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'Morocco',
        website: '',
        tax_id: '',
        payment_terms: '',
        credit_limit: '',
        customer_type: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = form.handleSubmit(async (formData) => {
    try {
      const customerData = {
        name: formData.name,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
        currency_code: currentOrganization?.currency || 'MAD',
        is_active: true,
        customer_code: formData.customer_code || undefined,
        contact_person: formData.contact_person || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        mobile: formData.mobile || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state_province: formData.state_province || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        website: formData.website || undefined,
        tax_id: formData.tax_id || undefined,
        payment_terms: formData.payment_terms || undefined,
        customer_type: formData.customer_type || undefined,
        price_list: undefined,
        assigned_to: undefined,
        notes: formData.notes || undefined,
      };

      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, ...customerData });
        toast.success('Customer updated successfully');
      } else {
        await createCustomer.mutateAsync(customerData);
        toast.success('Customer created successfully');
      }

      handleCloseDialog();
    } catch (error: unknown) {
      // Parse database constraint errors and set field-specific errors
      if (error instanceof Error && error.message.includes('customer_type_check')) {
        form.setError('customer_type', {
          type: 'manual',
          message: 'Invalid customer type. Must be one of: individual, business, government, or other',
        });
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to save customer');
      }
    }
  });

  const handleDelete = async (customer: Customer) => {
    showConfirm(`Are you sure you want to delete ${customer.name}?`, async () => {
      try {
        await deleteCustomer.mutateAsync(customer.id);
        toast.success('Customer deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
      }
    }, {variant: "destructive"});
  };

  const filteredCustomers = useMemo(() => {
    const q = tableState.search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.phone?.toLowerCase().includes(q) ||
        customer.mobile?.toLowerCase().includes(q) ||
        customer.customer_code?.toLowerCase().includes(q) ||
        customer.contact_person?.toLowerCase().includes(q),
    );
  }, [customers, tableState.search]);

  const { page, pageSize, setPage, setSearch, setPageSize } = tableState;

  const totalItems = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const formatCustomerType = (customerType: string | null) => {
    if (!customerType) return '—';
    return t(`accountingModule.customers.types.${customerType}`, customerType);
  };

  if (!currentOrganization || isLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Users, label: t('nav.customers', 'Customers'), isActive: true }
          ]}
          title={t('accountingModule.customers.title', 'Customers')}
          subtitle={t('accountingModule.customers.subtitle', 'Manage your customers for sales invoices')}
        />
      }
    >
      <div className="p-6">
        <ListPageLayout
          header={
            <ListPageHeader
              title={t('accountingModule.customers.title', 'Customers')}
              subtitle={t('accountingModule.customers.subtitle', 'Manage your customers for sales invoices')}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('accountingModule.customers.addCustomer', 'Add Customer')}
                  </Button>
                </div>
              }
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => setSearch(value)}
              searchPlaceholder={t('accountingModule.customers.searchPlaceholder', 'Search customers by name, email, or phone...')}
              isSearching={isLoading}
            />
          }
          pagination={
            totalItems > 0 ? (
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[12, 24, 48, 96]}
              />
            ) : null
          }
        >
          <div data-tour="billing-customers">
            {customers.length === 0 ? (
              <EmptyState
                variant="card"
                icon={Building2}
                title={t('accountingModule.customers.noCustomers', 'No customers')}
                description={t('accountingModule.customers.getStarted', 'Get started by creating a new customer.')}
                action={{
                  label: t('accountingModule.customers.addCustomer', 'Add Customer'),
                  onClick: () => handleOpenDialog(),
                }}
              />
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                variant="card"
                icon={Building2}
                title={t('app.noResults', 'No results found')}
                description={t('accountingModule.customers.noSearchResults', 'No customers match your search.')}
              />
            ) : (
              <ResponsiveList
                items={paginatedCustomers}
                isLoading={isLoading}
                keyExtractor={(customer) => customer.id}
                emptyIcon={Building2}
                emptyMessage={t('accountingModule.customers.noSearchResults', 'No customers match your search.')}
                renderCard={(customer) => (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{customer.name}</h3>
                        {customer.customer_code && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('accountingModule.customers.fields.code', 'Customer Code')}: {customer.customer_code}
                          </p>
                        )}
                        {customer.customer_type && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                            {formatCustomerType(customer.customer_type)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(customer)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          aria-label={t('app.edit', 'Edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          aria-label={t('app.delete', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {customer.contact_person && <p className="font-medium">{customer.contact_person}</p>}
                      {customer.email && (
                        <p className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </p>
                      )}
                      {(customer.phone || customer.mobile) && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          {customer.phone || customer.mobile}
                        </p>
                      )}
                      {(customer.city || customer.country) && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          {[customer.city, customer.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {customer.payment_terms && (
                        <p className="text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          {t('accountingModule.customers.fields.paymentTerms', 'Payment terms')}: {customer.payment_terms}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                renderTableHeader={
                  <tr>
                    <TableHead>{t('accountingModule.customers.table.name', 'Name')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.code', 'Code')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.type', 'Type')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.contact', 'Contact')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.email', 'Email')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.phone', 'Phone')}</TableHead>
                    <TableHead>{t('accountingModule.customers.table.location', 'Location')}</TableHead>
                    <TableHead className="text-end w-[100px]">{t('accountingModule.customers.table.actions', 'Actions')}</TableHead>
                  </tr>
                }
                renderTable={(customer) => (
                  <>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100 max-w-[160px]">
                      <div className="truncate">{customer.name}</div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{customer.customer_code || '—'}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{formatCustomerType(customer.customer_type)}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 max-w-[140px] truncate">{customer.contact_person || '—'}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{customer.email || '—'}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{customer.phone || customer.mobile || '—'}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                      {[customer.city, customer.country].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(customer)}
                          className="h-8 w-8 text-blue-600 dark:text-blue-400"
                          aria-label={t('app.edit', 'Edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer)}
                          className="h-8 w-8 text-red-600 dark:text-red-400"
                          aria-label={t('app.delete', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              />
            )}
          </div>
        </ListPageLayout>

          {/* Add/Edit Dialog */}
          <ResponsiveDialog
            open={isDialogOpen}
            onOpenChange={handleCloseDialog}
            title={editingCustomer ? t('accountingModule.customers.editCustomer', 'Edit Customer') : t('accountingModule.customers.addNewCustomer', 'Add New Customer')}
            description={editingCustomer
              ? t('accountingModule.customers.updateInfo', 'Update customer information')
              : t('accountingModule.customers.addForInvoices', 'Add a new customer for sales invoices')}
            size="2xl"
            contentClassName="max-h-[90vh] overflow-y-auto"
          >

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('accountingModule.customers.sections.basicInfo', 'Basic Information')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label={`${t('accountingModule.customers.fields.name', 'Customer Name')} *`}
                      error={form.formState.errors.name?.message}
                    >
                      <Input
                        id="name"
                        {...form.register('name')}
                        className={form.formState.errors.name ? 'border-red-500' : ''}
                      />
                    </FormField>
                    <FormField
                      label={t('accountingModule.customers.fields.code', 'Customer Code')}
                      error={form.formState.errors.customer_code?.message}
                    >
                      <Input
                        id="customer_code"
                        {...form.register('customer_code')}
                        placeholder={t('accountingModule.customers.fields.codePlaceholder', 'Optional reference code')}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label={t('accountingModule.customers.fields.type', 'Customer Type')}
                      error={form.formState.errors.customer_type?.message}
                    >
                      <Select
                        id="customer_type"
                        {...form.register('customer_type')}
                        className={form.formState.errors.customer_type ? 'border-red-500' : ''}
                      >
                        <option value="">{t('accountingModule.customers.fields.selectType', 'Select type')}</option>
                        <option value="individual">{t('accountingModule.customers.types.individual', 'Individual')}</option>
                        <option value="business">{t('accountingModule.customers.types.business', 'Business')}</option>
                        <option value="government">{t('accountingModule.customers.types.government', 'Government')}</option>
                        <option value="other">{t('accountingModule.customers.types.other', 'Other')}</option>
                      </Select>
                    </FormField>
                    <FormField
                      label={t('accountingModule.customers.fields.contactPerson', 'Contact Person')}
                      error={form.formState.errors.contact_person?.message}
                    >
                      <Input
                        id="contact_person"
                        {...form.register('contact_person')}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('accountingModule.customers.sections.contactDetails', 'Contact Details')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label={t('accountingModule.customers.fields.email', 'Email')}
                      error={form.formState.errors.email?.message}
                    >
                      <Input
                        id="email"
                        type="email"
                        {...form.register('email')}
                        className={form.formState.errors.email ? 'border-red-500' : ''}
                      />
                    </FormField>
                    <FormField
                      label={t('accountingModule.customers.fields.phone', 'Phone')}
                      error={form.formState.errors.phone?.message}
                    >
                      <Input
                        id="phone"
                        {...form.register('phone')}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label={t('accountingModule.customers.fields.mobile', 'Mobile')}
                      error={form.formState.errors.mobile?.message}
                    >
                      <Input
                        id="mobile"
                        {...form.register('mobile')}
                      />
                    </FormField>
                    <FormField
                      label={t('accountingModule.customers.fields.website', 'Website')}
                      error={form.formState.errors.website?.message}
                    >
                      <Input
                        id="website"
                        type="url"
                        {...form.register('website')}
                        placeholder="https://"
                        className={form.formState.errors.website ? 'border-red-500' : ''}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('accountingModule.customers.sections.address', 'Address')}</h3>
                  <div>
                    <Label htmlFor="address">{t('accountingModule.customers.fields.streetAddress', 'Street Address')}</Label>
                    <Input
                      id="address"
                      {...form.register('address')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">{t('accountingModule.customers.fields.city', 'City')}</Label>
                      <Input
                        id="city"
                        {...form.register('city')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state_province">{t('accountingModule.customers.fields.stateProvince', 'State/Province')}</Label>
                      <Input
                        id="state_province"
                        {...form.register('state_province')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postal_code">{t('accountingModule.customers.fields.postalCode', 'Postal Code')}</Label>
                      <Input
                        id="postal_code"
                        {...form.register('postal_code')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">{t('accountingModule.customers.fields.country', 'Country')}</Label>
                      <Input
                        id="country"
                        {...form.register('country')}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Terms */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('accountingModule.customers.sections.financialTerms', 'Financial Terms')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tax_id">{t('accountingModule.customers.fields.taxId', 'Tax ID / ICE')}</Label>
                      <Input
                        id="tax_id"
                        {...form.register('tax_id')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_terms">{t('accountingModule.customers.fields.paymentTerms', 'Payment Terms')}</Label>
                      <Select
                        id="payment_terms"
                        {...form.register('payment_terms')}
                      >
                        <option value="">{t('accountingModule.customers.fields.selectTerms', 'Select terms')}</option>
                        <option value="Cash on Delivery">{t('accountingModule.customers.terms.cod', 'Cash on Delivery')}</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Net 90">Net 90</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="credit_limit">{t('accountingModule.customers.fields.creditLimit', 'Credit Limit')} ({currentOrganization?.currency_symbol || 'MAD'})</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      step="0.01"
                      {...form.register('credit_limit')}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">{t('accountingModule.customers.fields.notes', 'Notes')}</Label>
                  <Textarea
                    id="notes"
                    {...form.register('notes')}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    {t('app.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? t('accountingModule.customers.updateCustomer', 'Update Customer') : t('accountingModule.customers.createCustomer', 'Create Customer')}
                  </Button>
                </DialogFooter>
              </form>
          </ResponsiveDialog>
        </div>
          <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/customers')({
  component: withRouteProtection(CustomersPage, 'read', 'Invoice'),
});

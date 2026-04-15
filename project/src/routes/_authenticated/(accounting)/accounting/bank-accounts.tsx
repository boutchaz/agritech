import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useBankAccounts, useCreateBankAccount, useDeleteBankAccount } from '@/hooks/useBankAccounts';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Landmark, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

function BankAccountsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: accounts = [], isLoading, isError } = useBankAccounts();
  const createAccount = useCreateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');
    const optionalNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number().optional(),
    );

    return z.object({
      account_name: z.string().min(1, requiredMessage),
      bank_name: z.string().optional(),
      account_number: z.string().optional(),
      currency_code: z.string().optional(),
      opening_balance: optionalNumber,
      branch_name: z.string().optional(),
      iban: z.string().optional(),
      swift_code: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      account_name: '',
      bank_name: '',
      account_number: '',
      currency_code: 'MAD',
      opening_balance: undefined,
      branch_name: '',
      iban: '',
      swift_code: '',
    },
  });

  const onSubmit = async (data: SubmitData) => {
    try {
      await createAccount.mutateAsync({
        account_name: data.account_name,
        bank_name: data.bank_name || undefined,
        account_number: data.account_number || undefined,
        currency_code: data.currency_code || 'MAD',
        opening_balance: data.opening_balance,
        current_balance: data.opening_balance,
        branch_name: data.branch_name || undefined,
        iban: data.iban || undefined,
        swift_code: data.swift_code || undefined,
        is_active: true,
      });
      toast.success(t('bankAccounts.createSuccess', 'Bank account created successfully'));
      setShowForm(false);
      form.reset();
    } catch {
      toast.error(t('bankAccounts.createError', 'Failed to create bank account'));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success(t('bankAccounts.deleteSuccess', 'Bank account deleted successfully'));
    } catch {
      toast.error(t('bankAccounts.deleteError', 'Failed to delete bank account'));
    }
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Landmark, label: t('bankAccounts.pageTitle', 'Bank Accounts'), isActive: true },
        ]}
        title={t('bankAccounts.pageTitle', 'Bank Accounts')}
        subtitle={t('bankAccounts.description', 'Manage your organization bank accounts.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('bankAccounts.addAccount', 'Add Account')}
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
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Landmark className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('bankAccounts.noAccounts', 'No bank accounts yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('bankAccounts.noAccountsDescription', 'Start by adding your first bank account.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('bankAccounts.addAccount', 'Add Account')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">{account.account_name}</CardTitle>
                    <Badge className={account.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}>
                      {account.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {account.bank_name && (
                      <p><span className="font-medium">{t('bankAccounts.bankName', 'Bank')}:</span> {account.bank_name}</p>
                    )}
                    {account.account_number && (
                      <p><span className="font-medium">{t('bankAccounts.accountNumber', 'Account #')}:</span> ****{account.account_number.slice(-4)}</p>
                    )}
                    {account.currency_code && (
                      <p><span className="font-medium">{t('bankAccounts.currency', 'Currency')}:</span> {account.currency_code}</p>
                    )}
                    {account.current_balance !== null && account.current_balance !== undefined && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(account.current_balance).toLocaleString()} {account.currency_code || 'MAD'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(account.id)}>
                      {t('common.delete', 'Delete')}
                    </Button>
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
            <h2 className="text-lg font-semibold mb-4">{t('bankAccounts.addAccount', 'Add Bank Account')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="bank-account-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bankAccounts.accountName', 'Account Name')}
                </label>
                <Input
                  id="bank-account-name"
                  {...form.register('account_name')}
                  placeholder={t('bankAccounts.accountNamePlaceholder', 'Enter account name')}
                  className={form.formState.errors.account_name ? 'border-red-400' : ''}
                />
                {form.formState.errors.account_name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.account_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-bank-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.bankName', 'Bank Name')}
                  </label>
                  <Input
                    id="bank-bank-name"
                    {...form.register('bank_name')}
                    placeholder={t('bankAccounts.bankNamePlaceholder', 'Enter bank name')}
                  />
                </div>

                <div>
                  <label htmlFor="bank-account-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.accountNumber', 'Account Number')}
                  </label>
                  <Input
                    id="bank-account-number"
                    {...form.register('account_number')}
                    placeholder={t('bankAccounts.accountNumberPlaceholder', 'Enter account number')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-currency-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.currency', 'Currency Code')}
                  </label>
                  <Input
                    id="bank-currency-code"
                    {...form.register('currency_code')}
                    placeholder={t('bankAccounts.currencyPlaceholder', 'MAD')}
                  />
                </div>

                <div>
                  <label htmlFor="bank-opening-balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.openingBalance', 'Opening Balance')}
                  </label>
                  <Input
                    id="bank-opening-balance"
                    {...form.register('opening_balance')}
                    type="number"
                    step="0.01"
                    placeholder={t('bankAccounts.openingBalancePlaceholder', 'Enter opening balance')}
                    className={form.formState.errors.opening_balance ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.opening_balance && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.opening_balance.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank-branch-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.branchName', 'Branch Name')}
                  </label>
                  <Input
                    id="bank-branch-name"
                    {...form.register('branch_name')}
                    placeholder={t('bankAccounts.branchNamePlaceholder', 'Enter branch name')}
                  />
                </div>

                <div>
                  <label htmlFor="bank-iban" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bankAccounts.iban', 'IBAN')}
                  </label>
                  <Input
                    id="bank-iban"
                    {...form.register('iban')}
                    placeholder={t('bankAccounts.ibanPlaceholder', 'Enter IBAN')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bank-swift-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bankAccounts.swiftCode', 'SWIFT Code')}
                </label>
                <Input
                  id="bank-swift-code"
                  {...form.register('swift_code')}
                  placeholder={t('bankAccounts.swiftCodePlaceholder', 'Enter SWIFT code')}
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
                <Button type="submit" variant="green" disabled={createAccount.isPending}>
                  {createAccount.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('bankAccounts.confirmDelete', 'Delete Bank Account')}
        description={t('bankAccounts.confirmDeleteDescription', 'Are you sure you want to delete this bank account?')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/bank-accounts')({
  component: withRouteProtection(BankAccountsPage, 'read', 'BankAccount'),
});

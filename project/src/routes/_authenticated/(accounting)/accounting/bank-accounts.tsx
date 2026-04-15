import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useBankAccounts, useDeleteBankAccount } from '@/hooks/useBankAccounts';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
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

  const { data: accounts = [], isLoading } = useBankAccounts();
  const deleteMutation = useDeleteBankAccount();

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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('bankAccounts.formComingSoon', 'Full bank account form coming soon.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
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

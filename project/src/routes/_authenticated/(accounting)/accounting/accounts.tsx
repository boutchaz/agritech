import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { MobileNavBar } from '@/components/MobileNavBar';
import { Building2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChartOfAccounts } from '@/components/Accounting/ChartOfAccounts';

const AccountsContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <>
          {/* Mobile Navigation Bar */}
          <MobileNavBar title={t('accountingModule.accounts.title', 'Chart of Accounts')} />

          {/* Desktop Header */}
          <div className="hidden md:block">
            <ModernPageHeader
              breadcrumbs={[
                { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
                { icon: BookOpen, label: t('nav.accounting', 'Accounting'), path: '/accounting' },
                { label: t('accountingModule.accounts.title', 'Chart of Accounts'), isActive: true },
              ]}
              title={t('accountingModule.accounts.title', 'Chart of Accounts')}
              subtitle={t('accountingModule.accounts.subtitle', 'Manage your accounting account hierarchy')}
            />
          </div>
        </>
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ChartOfAccounts />
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/accounts')({
  component: withRouteProtection(AccountsContent, 'read', 'Invoice'),
});

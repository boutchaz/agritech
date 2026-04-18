import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChartOfAccounts } from '@/components/Accounting/ChartOfAccounts';
import { SectionLoader } from '@/components/ui/loader';


const AccountsContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <SectionLoader />
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: BookOpen, label: t('nav.accounting', 'Accounting'), path: '/accounting' },
            { label: t('accountingModule.accounts.title', 'Chart of Accounts'), isActive: true },
          ]}
          title={t('accountingModule.accounts.title', 'Chart of Accounts')}
          subtitle={t('accountingModule.accounts.subtitle', 'Manage your accounting account hierarchy')}
        />
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

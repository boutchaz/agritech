import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Building2, BookOpen, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AccountMappingsManagement } from '@/components/settings/AccountMappingsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { SectionLoader } from '@/components/ui/loader';

function AccountMappingsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <SectionLoader />;
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: BookOpen, label: t('nav.accounting', 'Accounting'), path: '/accounting' },
            { icon: Link2, label: t('accountingModule.accountMappings.title', 'Account Mappings'), isActive: true },
          ]}
          title={t('accountingModule.accountMappings.title', 'Account Mappings')}
          subtitle={t('accountingModule.accountMappings.subtitle', 'Configure automatic account assignments for transactions')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <AccountMappingsManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/account-mappings')({
  component: withRouteProtection(
    AccountMappingsPage,
    'manage',
    'AccountMapping'
  ),
});

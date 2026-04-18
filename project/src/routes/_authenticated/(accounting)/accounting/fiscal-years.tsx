import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Building2, BookOpen, CalendarRange } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FiscalYearManagement } from '@/components/settings/FiscalYearManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { SectionLoader } from '@/components/ui/loader';

function FiscalYearsPage() {
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
            { icon: CalendarRange, label: t('accountingModule.fiscalYears.title', 'Fiscal Years'), isActive: true },
          ]}
          title={t('accountingModule.fiscalYears.title', 'Fiscal Years')}
          subtitle={t('accountingModule.fiscalYears.subtitle', 'Manage fiscal year periods and closings')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <FiscalYearManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/fiscal-years')({
  component: withRouteProtection(
    FiscalYearsPage,
    'manage',
    'FiscalYear'
  ),
});

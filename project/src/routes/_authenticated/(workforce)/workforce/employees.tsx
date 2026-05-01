
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Building2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import EmployeeManagement from '@/components/EmployeeManagement'
import ModernPageHeader from '@/components/ModernPageHeader'
import { PageLoader } from '@/components/ui/loader'

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Users, label: t('employees.title', 'Employees'), isActive: true },
        ]}
        title={t('employees.title', 'Employees')}
        subtitle={t('employees.subtitle', 'Manage employees, contracts, and assignments.')}
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <EmployeeManagement />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/employees')({
  component: AppContent,
})

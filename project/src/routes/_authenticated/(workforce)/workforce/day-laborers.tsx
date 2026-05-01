
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next';
import { Building2, Users, HardHat } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'
import DayLaborerManagement from '@/components/DayLaborerManagement'
import ModernPageHeader from '@/components/ModernPageHeader'
import { ListPageSkeleton } from '@/components/ui/page-skeletons';

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <ListPageSkeleton className="p-6" />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: HardHat, label: t('dayLaborers.title', 'Day Laborers'), isActive: true },
        ]}
        title={t('dayLaborers.title', 'Day Laborers')}
        subtitle={t('dayLaborers.subtitle', 'Track day laborers, attendance, and payments.')}
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <DayLaborerManagement />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/day-laborers')({
  component: AppContent,
})

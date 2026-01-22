import React, { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import { MobileNavBar } from '@/components/MobileNavBar'
import ModernPageHeader from '@/components/ModernPageHeader'
import { Loader2, Building2, Zap } from 'lucide-react'
 
// Lazy load utilities component (includes Recharts ~600KB)
const UtilitiesManagement = lazy(() => import('@/components/UtilitiesManagement'))
 
const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
 
  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('utilities.loading')}</p>
        </div>
      </div>
    );
  }
 
  return (
    <PageLayout
      activeModule="utilities"
      header={
        <>
          {/* Mobile Navigation Bar */}
          <MobileNavBar title={t('utilities.title')} />
 
          {/* Desktop Header */}
          <div className="hidden md:block">
            <ModernPageHeader
              breadcrumbs={[
                { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
                { icon: Zap, label: t('utilities.title'), isActive: true }
              ]}
              title={t('utilities.title')}
              subtitle={t('utilities.subtitle')}
            />
          </div>
        </>
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">{t('utilities.loadingDashboard')}</span>
          </div>
        }>
          <UtilitiesManagement />
        </Suspense>
      </div>
    </PageLayout>
  );
};
 
export const Route = createFileRoute('/_authenticated/(misc)/utilities')({
  component: AppContent,
})

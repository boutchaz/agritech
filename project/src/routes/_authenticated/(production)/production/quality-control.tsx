import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ClipboardCheck, Building2 } from 'lucide-react';

function QualityControlPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('production.qualityControl.loadingOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="quality-control"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: ClipboardCheck, label: t('production.qualityControl.pageTitle'), isActive: true }
          ]}
          title={t('production.qualityControl.pageTitle')}
          subtitle={t('production.qualityControl.subtitle')}
        />
      }
    >
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('production.qualityControl.moduleTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('production.qualityControl.underDevelopment')}
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('production.qualityControl.plannedFeatures.title')}</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li>{t('production.qualityControl.plannedFeatures.inspectionChecklists')}</li>
                <li>{t('production.qualityControl.plannedFeatures.defectDetection')}</li>
                <li>{t('production.qualityControl.plannedFeatures.gradeAssignment')}</li>
                <li>{t('production.qualityControl.plannedFeatures.metricsTracking')}</li>
                <li>{t('production.qualityControl.plannedFeatures.nonConformityReporting')}</li>
                <li>{t('production.qualityControl.plannedFeatures.acceptanceWorkflow')}</li>
                <li>{t('production.qualityControl.plannedFeatures.certificatesGeneration')}</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t('production.qualityControl.note.label')}:</strong> {t('production.qualityControl.note.message')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/production/quality-control')({
  component: QualityControlPage,
});

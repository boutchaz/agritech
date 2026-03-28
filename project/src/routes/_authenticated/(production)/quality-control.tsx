import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ClipboardCheck, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionLoader } from '@/components/ui/loader';


function QualityControlPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <SectionLoader />
    );
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: ClipboardCheck, label: t('production.qualityControl.breadcrumbLabel'), isActive: true }
        ]}
        title={t('production.qualityControl.title')}
        subtitle={t('production.qualityControl.subtitle')}
      />

      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('production.qualityControl.moduleTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('production.qualityControl.moduleDescription')}
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('production.qualityControl.plannedFeaturesTitle')}</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li>{t('production.qualityControl.featureChecklists')}</li>
                <li>{t('production.qualityControl.featureDefectDetection')}</li>
                <li>{t('production.qualityControl.featureGrades')}</li>
                <li>{t('production.qualityControl.featureMetrics')}</li>
                <li>{t('production.qualityControl.featureNonConformity')}</li>
                <li>{t('production.qualityControl.featureWorkflow')}</li>
                <li>{t('production.qualityControl.featureCertificates')}</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t('production.qualityControl.noteLabel')}:</strong> {t('production.qualityControl.noteMessage')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/quality-control')({
  component: QualityControlPage,
});

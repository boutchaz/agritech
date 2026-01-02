import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { PageLayout } from '../components/PageLayout';
import AnalysisPage from '../components/AnalysisPage';
import ModernPageHeader from '../components/ModernPageHeader';
import SubscriptionBanner from '../components/SubscriptionBanner';
import { Building2, Beaker, FlaskConical, ArrowRight } from 'lucide-react';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('analyses.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="analyses"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: Beaker, label: t('analyses.title'), isActive: true }
          ]}
          title={t('analyses.title')}
          subtitle={t('analyses.subtitle')}
        />
      }
    >
      <SubscriptionBanner />
      {/* Lab Services Banner */}
      <div className="px-6 pt-6">
        <Link to="/lab-services">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Services de Laboratoire Professionnels
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Programmez des analyses avec UM6P et d'autres laboratoires certifiés
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </div>
          </div>
        </Link>
      </div>

      <AnalysisPage />
    </PageLayout>
  );
};

export const Route = createFileRoute('/analyses')({
  component: AppContent,
});

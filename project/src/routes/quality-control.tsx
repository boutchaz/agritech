import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { PageLayout } from '../components/PageLayout';
import ModernPageHeader from '../components/ModernPageHeader';
import { ClipboardCheck, Building2 } from 'lucide-react';

function QualityControlPage() {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading organization...</p>
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
            { icon: ClipboardCheck, label: 'Quality Control', isActive: true }
          ]}
          title="Quality Control"
          subtitle="Manage quality inspections and control processes"
        />
      }
    >
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Quality Control Module
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The quality control module is currently under development.
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Planned Features:</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li>Quality inspection checklists for reception batches</li>
                <li>Visual defect detection and recording</li>
                <li>Grade assignment (Extra, A, B, C, etc.)</li>
                <li>Quality metrics tracking over time</li>
                <li>Non-conformity reporting</li>
                <li>Batch acceptance/rejection workflow</li>
                <li>Quality certificates generation</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Quality data can already be recorded in the Reception Batch form.
                This dedicated page will provide advanced quality control workflows and analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/quality-control')({
  component: QualityControlPage,
});

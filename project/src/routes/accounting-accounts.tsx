import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, BookOpen, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { ChartOfAccounts } from '../components/Accounting/ChartOfAccounts';

const AccountsContent = () => {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Hide sidebar on mobile (< 768px) */}
      <div className="hidden md:block">
        <Sidebar
          modules={[]}
          activeModule="accounting"
          onModuleChange={() => {}}
          isDarkMode={false}
          onThemeToggle={() => {}}
        />
      </div>
      <main className="flex-1 w-full bg-gray-50 dark:bg-gray-900">
        {/* Mobile navigation bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ml-auto"
            aria-label="Go to home"
          >
            <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        {/* TEST BANNER - Remove after deployment verification */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 text-center font-bold text-lg">
          ✨ DEPLOYMENT TEST - v2.0 - Dec 1, 2024 00:30 UTC ✨
        </div>

        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: BookOpen, label: 'Accounting', path: '/accounting' },
            { label: 'Chart of Accounts', isActive: true },
          ]}
          title="Chart of Accounts"
          subtitle="Manage your accounting account hierarchy"
        />
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <ChartOfAccounts />
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/accounting-accounts')({
  component: withRouteProtection(AccountsContent, 'read', 'Invoice'),
});

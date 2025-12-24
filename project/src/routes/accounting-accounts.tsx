import { createFileRoute } from '@tanstack/react-router';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { MobileNavBar } from '../components/MobileNavBar';
import { Building2, BookOpen } from 'lucide-react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { ChartOfAccounts } from '../components/Accounting/ChartOfAccounts';

const AccountsContent = () => {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar with mobile menu support */}
      <Sidebar
        modules={[]}
        activeModule="accounting"
        onModuleChange={() => {}}
        isDarkMode={false}
        onThemeToggle={() => {}}
      />
      <main className="flex-1 w-full lg:w-auto bg-gray-50 dark:bg-gray-900">
        {/* Mobile Navigation Bar */}
        <MobileNavBar title="Chart of Accounts" />

        {/* Desktop Header */}
        <div className="hidden md:block">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: BookOpen, label: 'Accounting', path: '/accounting' },
              { label: 'Chart of Accounts', isActive: true },
            ]}
            title="Chart of Accounts"
            subtitle="Manage your accounting account hierarchy"
          />
        </div>

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

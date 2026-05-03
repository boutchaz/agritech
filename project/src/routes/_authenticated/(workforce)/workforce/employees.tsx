
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import EmployeeManagement from '@/components/EmployeeManagement'
import { PageLoader } from '@/components/ui/loader'

const AppContent = () => {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <>
      
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <EmployeeManagement />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/employees')({
  component: AppContent,
})

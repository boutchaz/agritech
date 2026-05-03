
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import DayLaborerManagement from '@/components/DayLaborerManagement'
import { ListPageSkeleton } from '@/components/ui/page-skeletons';

const AppContent = () => {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <ListPageSkeleton className="p-6" />;
  }

  return (
    <>
      
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <DayLaborerManagement />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/day-laborers')({
  component: AppContent,
})

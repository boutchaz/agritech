import { createFileRoute } from '@tanstack/react-router';
import { AccessControlPanel } from '@/components/AccessControlPanel';

function AccessControlPage() {
  return (
    <div className="p-6">
      <AccessControlPanel />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/access-control')({
  component: AccessControlPage,
});

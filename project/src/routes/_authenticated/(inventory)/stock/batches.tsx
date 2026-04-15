import { createFileRoute } from '@tanstack/react-router';
import BatchManagement from '@/components/Stock/BatchManagement';

function BatchesPage() {
  return <BatchManagement />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/batches')({
  component: BatchesPage,
});

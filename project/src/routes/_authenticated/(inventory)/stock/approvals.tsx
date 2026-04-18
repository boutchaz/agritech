import { createFileRoute } from '@tanstack/react-router';
import StockApprovalQueue from '@/components/Stock/StockApprovalQueue';

function ApprovalsPage() {
  return <StockApprovalQueue />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/approvals')({
  component: ApprovalsPage,
});

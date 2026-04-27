import { createFileRoute } from '@tanstack/react-router';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { ChartOfAccounts } from '@/components/Accounting/ChartOfAccounts';


const AccountsContent = () => {
  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
      <ChartOfAccounts />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/accounts')({
  component: withRouteProtection(AccountsContent, 'read', 'Invoice'),
});

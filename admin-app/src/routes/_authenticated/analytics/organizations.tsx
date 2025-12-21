import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { format } from 'date-fns';
import { Eye, Building2 } from 'lucide-react';

function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['organizations', page, search],
    queryFn: () =>
      adminApi.getOrganizations({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    {
      key: 'name',
      header: 'Organization',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.countryCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'planType',
      header: 'Plan',
      render: (row: any) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {row.planType || 'Free'}
        </span>
      ),
    },
    {
      key: 'mrr',
      header: 'MRR',
      render: (row: any) => formatCurrency(row.mrr || 0),
    },
    {
      key: 'usersCount',
      header: 'Users',
    },
    {
      key: 'farmsCount',
      header: 'Farms',
    },
    {
      key: 'events7d',
      header: 'Activity (7d)',
      render: (row: any) => (
        <span className={row.events7d > 0 ? 'text-green-600' : 'text-gray-400'}>
          {row.events7d || 0} events
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: any) =>
        row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '-',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="text-gray-600">View all organizations and their usage</p>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={setSearch}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        searchPlaceholder="Search organizations..."
        actions={(row: any) => (
          <Link
            to="/analytics/organizations/$orgId"
            params={{ orgId: row.id }}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Link>
        )}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/organizations')({
  component: OrganizationsPage,
});

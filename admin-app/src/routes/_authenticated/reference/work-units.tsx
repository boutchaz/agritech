import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { Edit, Eye } from 'lucide-react';

function WorkUnitsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['work-units', page, search],
    queryFn: () =>
      adminApi.getReferenceData('work_units', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'description', header: 'Description' },
    { key: 'base_rate', header: 'Base Rate' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row: any) =>
        row.is_active ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Units</h1>
          <p className="text-gray-600">Manage work unit templates</p>
        </div>
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
        searchPlaceholder="Search work units..."
        actions={(row: any) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        )}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/work-units')({
  component: WorkUnitsPage,
});

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { toast } from 'sonner';
import { Check, X, Upload, Download, Eye } from 'lucide-react';

function AccountTemplatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['account-templates', page, search],
    queryFn: () =>
      adminApi.getReferenceData('account_templates', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (data: { ids: string[]; unpublish?: boolean }) =>
      adminApi.publishReferenceData({
        table: 'account_templates',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-templates'] });
      toast.success('Templates updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update templates');
    },
  });

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'account_type', header: 'Type' },
    { key: 'template_version', header: 'Version' },
    { key: 'source', header: 'Source' },
    {
      key: 'published_at',
      header: 'Published',
      render: (row: any) =>
        row.published_at ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Published
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <X className="h-3 w-3 mr-1" />
            Draft
          </span>
        ),
    },
  ];

  const handlePublish = (id: string, unpublish: boolean = false) => {
    publishMutation.mutate({ ids: [id], unpublish });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Templates</h1>
          <p className="text-gray-600">Manage chart of accounts templates</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
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
        searchPlaceholder="Search by code or name..."
        actions={(row: any) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </button>
            {row.published_at ? (
              <button
                onClick={() => handlePublish(row.id, true)}
                disabled={publishMutation.isPending}
                className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded"
                title="Unpublish"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handlePublish(row.id)}
                disabled={publishMutation.isPending}
                className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                title="Publish"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/account-templates')({
  component: AccountTemplatesPage,
});

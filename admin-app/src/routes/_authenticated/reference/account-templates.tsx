import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Check, X, Edit, Eye, Plus, Upload, Download } from 'lucide-react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

// Schema for Account Templates
const templateSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  account_type: z.string().min(1, 'Account Type is required'),
  account_subtype: z.string().optional(),
  country_code: z.string().length(2, 'Must be 2-letter ISO code'),
  template_version: z.string().default('1.0.0'),
  is_active: z.boolean().default(true),
});

const templateFields: FieldDefinition[] = [
  { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. 1000' },
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Assets' },
  {
    name: 'account_type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Asset', value: 'Asset' },
      { label: 'Liability', value: 'Liability' },
      { label: 'Equity', value: 'Equity' },
      { label: 'Revenue', value: 'Revenue' },
      { label: 'Expense', value: 'Expense' }
    ],
    required: true
  },
  { name: 'account_subtype', label: 'Subtype', type: 'text', placeholder: 'e.g. Current Assets' },
  { name: 'country_code', label: 'Country Code', type: 'text', required: true, placeholder: 'US, FR, MA...' },
  { name: 'template_version', label: 'Version', type: 'text', placeholder: '1.0.0' },
];

function AccountTemplatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['account-templates', page, search],
    queryFn: () =>
      adminApi.getReferenceData('account_templates', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: any) => {
      return adminApi.importReferenceData({
        table: 'account_templates',
        rows: [{ data: formData }],
        updateExisting: !!formData.id,
        version: formData.template_version || '1.0.0',
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['account-templates'] });
        toast.success(selectedItem ? 'Template updated' : 'Template created');
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save template: ' + (result.errors?.[0]?.error || 'Unknown error'));
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
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

  const handleEdit = (row: any) => {
    setSelectedItem(row);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handlePublish = (id: string, unpublish: boolean = false) => {
    publishMutation.mutate({ ids: [id], unpublish });
  };

  const columns = [
    { key: 'account_code', header: 'Code' },
    { key: 'account_name', header: 'Name' },
    { key: 'account_type', header: 'Type' },
    { key: 'country_code', header: 'Country' },
    { key: 'template_version', header: 'Version' },
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Templates</h1>
          <p className="text-gray-600">Manage chart of accounts templates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Template
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
              onClick={() => handleEdit(row)}
              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
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

      <ReferenceDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => saveMutation.mutateAsync(data)}
        initialData={selectedItem}
        title="Account Template"
        schema={templateSchema}
        fields={templateFields}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/account-templates')({
  component: AccountTemplatesPage,
});

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Check, X, Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

const mappingSchema = z.object({
  id: z.string().optional(),
  mapping_type: z.string().min(1, 'Type is required'),
  entity_type: z.string().min(1, 'Entity is required'),
  debit_account_code: z.string().min(1, 'Debit Code is required'),
  credit_account_code: z.string().min(1, 'Credit Code is required'),
  template_version: z.string().default('1.0.0'),
});

const mappingFields: FieldDefinition[] = [
  { name: 'mapping_type', label: 'Mapping Type', type: 'text', required: true, placeholder: 'e.g. invoice_payment' },
  {
    name: 'entity_type', label: 'Entity Type', type: 'select',
    options: [
      { label: 'Customer', value: 'Customer' },
      { label: 'Supplier', value: 'Supplier' },
      { label: 'Employee', value: 'Employee' },
      { label: 'Bank', value: 'Bank' },
      { label: 'Cash', value: 'Cash' },
      { label: 'Tax', value: 'Tax' }
    ],
    required: true
  },
  { name: 'debit_account_code', label: 'Debit Account Code', type: 'text', required: true, placeholder: 'e.g. 5141' },
  { name: 'credit_account_code', label: 'Credit Account Code', type: 'text', required: true, placeholder: 'e.g. 3421' },
  { name: 'template_version', label: 'Version', type: 'text', placeholder: '1.0.0' },
];

function AccountMappingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['account-mappings', page, search],
    queryFn: () =>
      adminApi.getReferenceData('account_mappings', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: any) => {
      return adminApi.importReferenceData({
        table: 'account_mappings',
        rows: [{ data: formData }],
        updateExisting: !!formData.id,
        version: formData.template_version || '1.0.0',
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['account-mappings'] });
        toast.success(selectedItem ? 'Mapping updated' : 'Mapping created');
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save mapping: ' + (result.errors?.[0]?.error || 'Unknown error'));
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save mapping');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (data: { ids: string[]; unpublish?: boolean }) =>
      adminApi.publishReferenceData({
        table: 'account_mappings',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings'] });
      toast.success('Mapping updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update mapping');
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
    { key: 'mapping_type', header: 'Type' },
    { key: 'mapping_key', header: 'Key' },
    { key: 'account_code', header: 'Account Code' },
    { key: 'country_code', header: 'Country' },
    { key: 'accounting_standard', header: 'Standard' },
    { key: 'template_version', header: 'Version', render: (row: any) => row.template_version || '1.0.0' },
    {
      key: 'published_at',
      header: 'Status',
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
          <h1 className="text-2xl font-bold text-gray-900">Account Mappings</h1>
          <p className="text-gray-600">Manage automatic journal entry mappings</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </button>
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
        searchPlaceholder="Search mappings..."
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
        title="Account Mapping"
        schema={mappingSchema}
        fields={mappingFields}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/account-mappings')({
  component: AccountMappingsPage,
});

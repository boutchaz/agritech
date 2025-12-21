import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Check, X, Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';

// Define the schema for the module form
const moduleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  required_plan: z.string().nullable().optional(), // 'essential', 'professional', 'enterprise' or null
  is_active: z.boolean().default(true),
});

const moduleFields: FieldDefinition[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. dashboard' },
  { name: 'icon', label: 'Icon', type: 'text', placeholder: 'Lucide icon name' },
  { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g. core, production' },
  { name: 'description', label: 'Description', type: 'textarea' },
  {
    name: 'required_plan',
    label: 'Required Plan',
    type: 'select',
    options: [
      { label: 'Free (None)', value: '' }, // Empty string for null in select
      { label: 'Essential', value: 'essential' },
      { label: 'Professional', value: 'professional' },
      { label: 'Enterprise', value: 'enterprise' },
    ],
  },
  { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Module is available' },
];

function ModulesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['modules', page, search],
    queryFn: () =>
      adminApi.getReferenceData('modules', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: any) => {
      // transform empty string back to null for required_plan
      const dataToSave = {
        ...formData,
        required_plan: formData.required_plan === '' ? null : formData.required_plan,
      };

      return adminApi.importReferenceData({
        table: 'modules',
        rows: [{ data: dataToSave }],
        updateExisting: !!dataToSave.id,
        version: '1.0.0', // TODO: Make dynamic or from config
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['modules'] });
        toast.success(selectedItem ? 'Module updated' : 'Module created');
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save module: ' + (result.errors?.[0]?.error || 'Unknown error'));
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save module');
    },
  });

  const handleEdit = (row: any) => {
    // Transform null to empty string for key matching in select
    const formattedRow = {
      ...row,
      required_plan: row.required_plan === null ? '' : row.required_plan
    };
    setSelectedItem(formattedRow);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const publishMutation = useMutation({
    mutationFn: (data: { ids: string[]; unpublish?: boolean }) =>
      adminApi.publishReferenceData({
        table: 'modules',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Module updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update module');
    },
  });

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'icon', header: 'Icon' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    { key: 'required_plan', header: 'Plan' },
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
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="text-gray-600">Manage platform modules and features</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Module
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
        searchPlaceholder="Search modules..."
        actions={(row: any) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => handleEdit(row)}
              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <ReferenceDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => saveMutation.mutateAsync(data)}
        initialData={selectedItem}
        title="Module"
        schema={moduleSchema}
        fields={moduleFields}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/modules')({
  component: ModulesPage,
});

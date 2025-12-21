import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';

const currencySchema = z.object({
  code: z.string().min(3, 'Code must be 3 characters').max(3),
  name: z.string().min(1, 'Name is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  is_active: z.boolean().default(true),
});

const currencyFields: FieldDefinition[] = [
  { name: 'code', label: 'Code', type: 'text', placeholder: 'USD', required: true },
  { name: 'name', label: 'Name', type: 'text', placeholder: 'US Dollar', required: true },
  { name: 'symbol', label: 'Symbol', type: 'text', placeholder: '$', required: true },
  { name: 'is_active', label: 'Active', type: 'checkbox' },
];

function CurrenciesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['currencies', page, search],
    queryFn: () =>
      adminApi.getReferenceData('currencies', {
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        search,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (formData: any) => {
      // For updates, the PK is usually the code, but the API might expect 'code' as ID or similar.
      // Based on schema, 'code' is PK. 
      // If we are editing, we can't easily change the PK (code) without logic, but for now allow editing fields.

      return adminApi.importReferenceData({
        table: 'currencies',
        rows: [{ data: formData }],
        updateExisting: true, // Upsert based on PK
        version: '1.0.0',
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['currencies'] });
        toast.success(selectedItem ? 'Currency updated' : 'Currency created');
        setIsModalOpen(false);
      } else {
        toast.error('Failed to save currency: ' + (result.errors?.[0]?.error || 'Unknown error'));
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save currency');
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

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'symbol', header: 'Symbol' },
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
          <h1 className="text-2xl font-bold text-gray-900">Currencies</h1>
          <p className="text-gray-600">Manage supported currencies</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Currency
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
        searchPlaceholder="Search currencies..."
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
        title="Currency"
        schema={currencySchema}
        fields={currencyFields}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reference/currencies')({
  component: CurrenciesPage,
});

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Check, X, Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

const treeCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    template_version: z.string().default('1.0.0'),
});

const treeCategoryFields: FieldDefinition[] = [
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Citrus' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'template_version', label: 'Version', type: 'text', placeholder: '1.0.0' },
];

function TreeCategoriesPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const pageSize = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tree-categories', page, search],
        queryFn: () =>
            adminApi.getReferenceData('tree_categories', {
                limit: String(pageSize),
                offset: String((page - 1) * pageSize),
                search,
            }),
    });

    const saveMutation = useMutation({
        mutationFn: (formData: any) => {
            return adminApi.importReferenceData({
                table: 'tree_categories',
                rows: [{ data: formData }],
                updateExisting: !!formData.id,
                version: formData.template_version || '1.0.0',
            });
        },
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['tree-categories'] });
                toast.success(selectedItem ? 'Tree Category updated' : 'Tree Category created');
                setIsModalOpen(false);
            } else {
                toast.error('Failed to save category: ' + (result.errors?.[0]?.error || 'Unknown error'));
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save category');
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
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'template_version', header: 'Version', render: (row: any) => row.template_version || '1.0.0' },
    ];

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tree Categories</h1>
                    <p className="text-gray-600">Manage tree categories</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
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
                searchPlaceholder="Search categories..."
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
                title="Tree Category"
                schema={treeCategorySchema}
                fields={treeCategoryFields}
                isLoading={saveMutation.isPending}
            />
        </div>
    );
}

export const Route = createFileRoute('/_authenticated/reference/tree-categories')({
    component: TreeCategoriesPage,
});

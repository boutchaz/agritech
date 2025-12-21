import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Check, X, Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';

// Generic Schema for simple Name/Description tables
const genericSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    name_ar: z.string().optional(),
    name_fr: z.string().optional(),
    description: z.string().optional(),
    description_ar: z.string().optional(),
    description_fr: z.string().optional(),
    template_version: z.string().default('1.0.0'),
});

const genericFields: FieldDefinition[] = [
    { name: 'name', label: 'Name (EN)', type: 'text', required: true },
    { name: 'name_fr', label: 'Name (FR)', type: 'text' },
    { name: 'name_ar', label: 'Name (AR)', type: 'text' },
    { name: 'description', label: 'Description (EN)', type: 'textarea' },
    { name: 'description_fr', label: 'Description (FR)', type: 'textarea' },
    { name: 'description_ar', label: 'Description (AR)', type: 'textarea' },
    { name: 'template_version', label: 'Version', type: 'text', placeholder: '1.0.0' },
];

function GenericReferencePage({
    title,
    table,
    schema = genericSchema,
    fields = genericFields
}: {
    title: string;
    table: string;
    schema?: any;
    fields?: FieldDefinition[]
}) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const pageSize = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: [table, page, search],
        queryFn: () =>
            adminApi.getReferenceData(table, {
                limit: String(pageSize),
                offset: String((page - 1) * pageSize),
                search,
            }),
    });

    const saveMutation = useMutation({
        mutationFn: (formData: any) => {
            return adminApi.importReferenceData({
                table,
                rows: [{ data: formData }],
                updateExisting: !!formData.id,
                version: formData.template_version || '1.0.0',
            });
        },
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: [table] });
                toast.success(selectedItem ? `${title} updated` : `${title} created`);
                setIsModalOpen(false);
            } else {
                toast.error(`Failed to save ${title}: ` + (result.errors?.[0]?.error || 'Unknown error'));
            }
        },
        onError: (error: any) => {
            toast.error(error.message || `Failed to save ${title}`);
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
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    <p className="text-gray-600">Manage {title.toLowerCase()}</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add {title}
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
                searchPlaceholder={`Search ${title.toLowerCase()}...`}
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
                title={title}
                schema={schema}
                fields={fields}
                isLoading={saveMutation.isPending}
            />
        </div>
    );
}

// Soil Types Route
export const Route = createFileRoute('/_authenticated/reference/soil-types')({
    component: () => <GenericReferencePage title="Soil Types" table="soil_types" />,
});

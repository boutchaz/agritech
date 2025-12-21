import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { ReferenceDataModal, FieldDefinition } from '@/components/ReferenceDataModal';
import { toast } from 'sonner';
import { Edit, Eye, Plus } from 'lucide-react';
import { z } from 'zod';

const permissionSchema = z.object({
    name: z.string().min(1, 'Name is required').regex(/^[a-z]+\.[a-z]+$/, 'Format: resource.action'),
    display_name: z.string().min(1, 'Display Name is required'),
    resource: z.string().min(1, 'Resource is required'),
    action: z.string().min(1, 'Action is required'),
    description: z.string().optional(),
});

const permissionFields: FieldDefinition[] = [
    { name: 'name', label: 'Key (resource.action)', type: 'text', placeholder: 'users.read', required: true },
    { name: 'display_name', label: 'Display Name', type: 'text', placeholder: 'View Users', required: true },
    { name: 'resource', label: 'Resource', type: 'text', placeholder: 'users', required: true },
    {
        name: 'action',
        label: 'Action',
        type: 'select',
        options: [
            { label: 'Read', value: 'read' },
            { label: 'Create', value: 'create' },
            { label: 'Update', value: 'update' },
            { label: 'Delete', value: 'delete' },
            { label: 'Manage', value: 'manage' }
        ],
        required: true
    },
    { name: 'description', label: 'Description', type: 'textarea' },
];

function PermissionsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const pageSize = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['permissions', page, search],
        queryFn: () =>
            adminApi.getReferenceData('permissions', {
                limit: String(pageSize),
                offset: String((page - 1) * pageSize),
                search,
            }),
    });

    const saveMutation = useMutation({
        mutationFn: (formData: any) => {
            // name is the logical PK for permissions typically
            return adminApi.importReferenceData({
                table: 'permissions',
                rows: [{ data: formData }],
                updateExisting: true,
                version: '1.0.0',
            });
        },
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['permissions'] });
                toast.success(selectedItem ? 'Permission updated' : 'Permission created');
                setIsModalOpen(false);
            } else {
                toast.error('Failed to save permission: ' + (result.errors?.[0]?.error || 'Unknown error'));
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save permission');
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
        { key: 'name', header: 'Key' },
        { key: 'display_name', header: 'Name' },
        { key: 'resource', header: 'Resource' },
        { key: 'action', header: 'Action' },
        { key: 'description', header: 'Description' },
    ];

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
                    <p className="text-gray-600">Manage system permissions</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-gray-50 hover:bg-gray-900/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Permission
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
                searchPlaceholder="Search permissions..."
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
                title="Permission"
                schema={permissionSchema}
                fields={permissionFields}
                isLoading={saveMutation.isPending}
            />
        </div>
    );
}

export const Route = createFileRoute('/_authenticated/reference/permissions')({
    component: PermissionsPage,
});

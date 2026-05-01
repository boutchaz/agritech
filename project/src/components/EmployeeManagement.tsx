import {  useEffect, useMemo, useState  } from "react";
import { Plus, X, Edit2, Trash2, Calendar } from 'lucide-react';
import { workersApi } from '../lib/api/workers';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_CURRENCY } from '../utils/currencies';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, type FieldErrors, type Resolver, type SubmitHandler } from 'react-hook-form';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { useTranslation } from 'react-i18next';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';


interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  cin: string; // mapped from employee_id in DB when rendering
  phone: string;
  address: string; // mapped from notes in DB when rendering
  hire_date: string;
  position: string;
  salary: number;
  status: 'active' | 'inactive';
  photos: string[];
}

const createEmployeeSchema = (t: any) => z.object({
  first_name: z.string().min(1, t('employeeManagement.validation.firstNameRequired', 'First name is required')),
  last_name: z.string().min(1, t('employeeManagement.validation.lastNameRequired', 'Last name is required')),
  cin: z.string().min(3, t('employeeManagement.validation.cinInvalid', 'Invalid CIN')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  hire_date: z.string().min(1, t('employeeManagement.validation.hireDateRequired', 'Hire date is required')),
  position: z.string().min(1, t('employeeManagement.validation.positionRequired', 'Position is required')),
  salary: z.coerce.number().nonnegative(t('employeeManagement.validation.salaryInvalid', 'Invalid salary')),
  status: z.union([z.literal('active'), z.literal('inactive')]),
  photos: z.array(z.string().url()).optional().default([]),
});

type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeSchema>>;

const EmployeeManagement = () => {
  const { currentFarm, currentOrganization } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const farmId = currentFarm?.id;
  const organizationId = currentOrganization?.id;
  const currency = currentOrganization?.currency || DEFAULT_CURRENCY;

  const emptyDefaults: EmployeeFormValues = useMemo(() => ({
    first_name: '',
    last_name: '',
    cin: '',
    phone: '',
    address: '',
    hire_date: new Date().toISOString().split('T')[0],
    position: '',
    salary: 0,
    status: 'active',
    photos: [],
  }), []);

  const employeeSchema = useMemo(() => createEmployeeSchema(t), [t]);

  const employeeResolver: Resolver<EmployeeFormValues> = async (values) => {
    const parsed = employeeSchema.safeParse(values);

    if (parsed.success) {
      return {
        values: parsed.data,
        errors: {},
      };
    }

    const zodFieldErrors: Record<string, { type: string; message: string }> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === 'string' && !zodFieldErrors[field]) {
        zodFieldErrors[field] = {
          type: issue.code,
          message: issue.message,
        };
      }
    });

    return {
      values: {},
      errors: zodFieldErrors as unknown as FieldErrors<EmployeeFormValues>,
    };
  };

  const form = useForm<EmployeeFormValues>({
    resolver: employeeResolver,
    defaultValues: emptyDefaults,
  });

  const onSubmit: SubmitHandler<EmployeeFormValues> = (values) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, values });
    } else {
      addEmployeeMutation.mutate(values);
    }
  };

  // Reset form values when switching between add/edit
  useEffect(() => {
    if (editingEmployee) {
      form.reset({
        first_name: editingEmployee.first_name,
        last_name: editingEmployee.last_name,
        cin: editingEmployee.cin,
        phone: editingEmployee.phone || '',
        address: editingEmployee.address || '',
        hire_date: editingEmployee.hire_date,
        position: editingEmployee.position,
        salary: editingEmployee.salary,
        status: editingEmployee.status,
        photos: editingEmployee.photos ?? [],
      });
    } else if (showAddModal) {
      form.reset(emptyDefaults);
    }
  }, [editingEmployee, showAddModal, form, emptyDefaults]);

  const employeesQuery = useQuery({
    queryKey: ['employees', organizationId, farmId],
    queryFn: async (): Promise<Employee[]> => {
      if (!organizationId || !farmId) return [];
      const workers = await workersApi.getAll({ farmId }, organizationId);

      return workers
        .filter((worker) => worker.worker_type === 'fixed_salary')
        .map((worker) => ({
          id: worker.id,
          first_name: worker.first_name,
          last_name: worker.last_name,
          cin: worker.cin || '',
          phone: worker.phone || '',
          address: worker.notes || '',
          hire_date: worker.hire_date,
          position: worker.position || '',
          salary: worker.monthly_salary ?? 0,
          status: worker.is_active ? 'active' as const : 'inactive' as const,
          photos: ((worker as any).photos as string[] | undefined) ?? [],
        }))
        .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
    enabled: !!organizationId && !!farmId,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      if (!farmId || !organizationId) {
        throw new Error(t('employeeManagement.errors.selectFarmDetailed', 'No farm selected. Please select a farm.'));
      }

      return workersApi.create({
        first_name: values.first_name,
        last_name: values.last_name,
        cin: values.cin,
        phone: values.phone || undefined,
        position: values.position,
        hire_date: values.hire_date,
        monthly_salary: values.salary,
        is_active: values.status === 'active',
        notes: values.address || undefined,
        photos: values.photos,
        farm_id: farmId,
        worker_type: 'fixed_salary',
        payment_frequency: 'monthly',
        is_cnss_declared: false,
      } as any, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', organizationId, farmId] });
      setShowAddModal(false);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EmployeeFormValues }) => {
      if (!farmId || !organizationId) {
        throw new Error(t('employeeManagement.errors.selectFarmDetailed', 'No farm selected. Please select a farm.'));
      }

      await workersApi.update(id, {
        first_name: values.first_name,
        last_name: values.last_name,
        cin: values.cin,
        phone: values.phone || undefined,
        position: values.position,
        hire_date: values.hire_date,
        monthly_salary: values.salary,
        is_active: values.status === 'active',
        notes: values.address || undefined,
        photos: values.photos,
        farm_id: farmId,
        worker_type: 'fixed_salary',
        payment_frequency: 'monthly',
      } as any, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', organizationId, farmId] });
      setEditingEmployee(null);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!farmId || !organizationId) {
        throw new Error(t('employeeManagement.errors.selectFarm', 'No farm selected.'));
      }
      await workersApi.delete(id, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', organizationId, farmId] });
    },
  });

  const employees = employeesQuery.data ?? [];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredEmployees = employees.filter((employee) => {
    if (!normalizedSearch) return true;

    return [
      employee.first_name,
      employee.last_name,
      employee.cin,
      employee.phone,
      employee.position,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const openAddModal = () => {
    if (!farmId) return;
    setEditingEmployee(null);
    setShowAddModal(true);
    form.reset(emptyDefaults);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowAddModal(true);
  };

  const renderEmployeeCard = (employee: Employee) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {employee.photos?.[0] ? (
            <img
              src={employee.photos[0]}
              alt=""
              className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-300 flex-shrink-0">
              {(employee.first_name?.[0] || '').toUpperCase()}{(employee.last_name?.[0] || '').toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{employee.position || '—'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(employee)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit2 className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              showConfirm(t('employeeManagement.confirm.delete', 'Are you sure you want to delete this employee?'), () => {
                deleteEmployeeMutation.mutate(employee.id);
              });
            }}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">{t('employeeManagement.fields.cin', 'CIN')}</span>
          <span className="text-right text-gray-900 dark:text-white">{employee.cin || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">{t('employeeManagement.fields.phone', 'Phone')}</span>
          <span className="text-right text-gray-900 dark:text-white">{employee.phone || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">{t('employeeManagement.fields.hireDate', 'Hire date')}</span>
          <span className="text-right text-gray-900 dark:text-white">{new Date(employee.hire_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">{t('employeeManagement.fields.salary', 'Salary')}</span>
          <span className="text-right text-gray-900 dark:text-white">{employee.salary.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">{t('employeeManagement.fields.status', 'Status')}</span>
          <span className={employee.status === 'active' ? 'text-green-600' : 'text-red-600'}>
            {employee.status === 'active'
              ? t('employeeManagement.status.active', 'Active')
              : t('employeeManagement.status.inactive', 'Inactive')}
          </span>
        </div>
      </div>
    </div>
  );

  const renderEmployeeTable = (employee: Employee) => (
    <>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          {employee.photos?.[0] ? (
            <img
              src={employee.photos[0]}
              alt=""
              className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-300 flex-shrink-0">
              {(employee.first_name?.[0] || '').toUpperCase()}{(employee.last_name?.[0] || '').toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{employee.position || '—'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">{employee.cin || '—'}</TableCell>
      <TableCell className="px-4 py-3">{employee.phone || '—'}</TableCell>
      <TableCell className="px-4 py-3">{new Date(employee.hire_date).toLocaleDateString()}</TableCell>
      <TableCell className="px-4 py-3">{employee.salary.toFixed(2)} {currency}</TableCell>
      <TableCell className="px-4 py-3">
        <span className={employee.status === 'active' ? 'text-green-600' : 'text-red-600'}>
          {employee.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(employee)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              showConfirm(t('employeeManagement.confirm.delete', 'Are you sure you want to delete this employee?'), () => {
                deleteEmployeeMutation.mutate(employee.id);
              });
            }}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </>
  );

  return (
    <ListPageLayout
      className="p-6"
      header={
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('employeeManagement.title', 'Employee Management')}
          </h2>
          <Button
            variant="green"
            type="button"
            onClick={openAddModal}
            disabled={!farmId}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${farmId ? '' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            title={!farmId ? t('employeeManagement.errors.selectFarmToAdd', 'Select a farm to add an employee') : undefined}
          >
            <Plus className="h-5 w-5" />
            <span>{t('employeeManagement.actions.newEmployee', 'New Employee')}</span>
          </Button>
        </div>
      }
      filters={
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('employeeManagement.searchPlaceholder', 'Search for an employee...')}
          isSearching={employeesQuery.isFetching}
        />
      }
    >
      {!farmId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-amber-800 dark:text-amber-300 text-sm">
          {t('employeeManagement.errors.selectFarmToManage', 'Select a farm to manage employees.')}
        </div>
      )}

      {employeesQuery.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{t('employeeManagement.errors.loadFailed', 'Unable to load employees.')}</p>
        </div>
      )}

      <ResponsiveList
        items={filteredEmployees}
        isLoading={employeesQuery.isLoading}
        isFetching={employeesQuery.isFetching}
        keyExtractor={(employee) => employee.id}
        renderCard={renderEmployeeCard}
        renderTableHeader={(
          <TableRow>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.table.employee', 'Employee')}</TableHead>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.fields.cin', 'CIN')}</TableHead>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.fields.phone', 'Phone')}</TableHead>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.fields.hireDate', 'Hire date')}</TableHead>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.fields.salary', 'Salary')}</TableHead>
            <TableHead className="px-4 py-3 text-left font-medium">{t('employeeManagement.fields.status', 'Status')}</TableHead>
            <TableHead className="px-4 py-3 text-right font-medium">{t('employeeManagement.table.actions', 'Actions')}</TableHead>
          </TableRow>
        )}
        renderTable={renderEmployeeTable}
        emptyIcon={Calendar}
        emptyTitle={!farmId ? t('employeeManagement.empty.noFarmTitle', 'No farm selected') : t('employeeManagement.empty.noEmployeesTitle', 'No employees')}
        emptyMessage={!farmId
          ? t('employeeManagement.errors.selectFarmToManage', 'Select a farm to manage employees.')
          : normalizedSearch
            ? t('employeeManagement.empty.search', 'No employees match your search.')
            : t('employeeManagement.empty.default', 'No employees yet.')}
        emptyAction={farmId && !normalizedSearch ? {
          label: t('employeeManagement.actions.addFirst', 'Add your first employee'),
          onClick: openAddModal,
        } : undefined}
      />

      {/* Add/Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingEmployee
                  ? t('employeeManagement.modal.editTitle', 'Edit Employee')
                  : t('employeeManagement.modal.newTitle', 'New Employee')}
              </h3>
              <Button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={t('employeeManagement.fields.firstName', 'First name')} htmlFor="emp_first_name" error={form.formState.errors.first_name?.message as string}>
                      <Input id="emp_first_name" type="text" {...form.register('first_name')} />
                    </FormField>
                    <FormField label={t('employeeManagement.fields.lastName', 'Last name')} htmlFor="emp_last_name" error={form.formState.errors.last_name?.message as string}>
                      <Input id="emp_last_name" type="text" {...form.register('last_name')} />
                    </FormField>
                  </div>

                  <FormField label={t('employeeManagement.fields.cin', 'CIN')} htmlFor="emp_cin" error={form.formState.errors.cin?.message as string}>
                    <Input id="emp_cin" type="text" {...form.register('cin')} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.phone', 'Phone')} htmlFor="emp_phone" error={form.formState.errors.phone?.message as string}>
                    <Input id="emp_phone" type="tel" {...form.register('phone')} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.address', 'Address')} htmlFor="emp_address" error={form.formState.errors.address?.message as string}>
                    <Input id="emp_address" type="text" {...form.register('address')} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.hireDate', 'Hire date')} htmlFor="emp_hire_date" error={form.formState.errors.hire_date?.message as string}>
                    <Input id="emp_hire_date" type="date" {...form.register('hire_date')} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.position', 'Position')} htmlFor="emp_position" error={form.formState.errors.position?.message as string}>
                    <Input id="emp_position" type="text" {...form.register('position')} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.salaryWithCurrency', 'Salary ({{currency}})', { currency })} htmlFor="emp_salary" error={form.formState.errors.salary?.message as string}>
                    <Input id="emp_salary" type="number" step={1} placeholder={t('employeeManagement.fields.salaryPlaceholder', 'Salary in {{currency}}', { currency })} {...form.register('salary', { valueAsNumber: true })} />
                  </FormField>

                  <FormField label={t('employeeManagement.fields.status', 'Status')} htmlFor="emp_status" error={form.formState.errors.status?.message as string}>
                    <Select id="emp_status" {...form.register('status' as const)}>
                      <option value="active">{t('employeeManagement.status.active', 'Active')}</option>
                      <option value="inactive">{t('employeeManagement.status.inactive', 'Inactive')}</option>
                    </Select>
                  </FormField>

                  {organizationId && (
                    <FormField label={t('employeeManagement.fields.photos', 'Photos')}>
                      <Controller
                        control={form.control}
                        name="photos"
                        render={({ field }) => (
                          <PhotoUpload
                            organizationId={organizationId}
                            photos={field.value ?? []}
                            onChange={(p) => field.onChange(p)}
                            bucket="entity-photos"
                            entityType="worker"
                            entityId={editingEmployee?.id}
                            folder={editingEmployee?.id || `new-worker-${Date.now()}`}
                            fieldName="photos"
                            maxPhotos={4}
                            showPrimary
                          />
                        )}
                      />
                    </FormField>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingEmployee(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button variant="green" type="submit" disabled={addEmployeeMutation.isPending || updateEmployeeMutation.isPending} className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-60" >
                      {editingEmployee ? t('employeeManagement.actions.update', 'Update') : t('common.add', 'Add')}
                    </Button>
                  </div>
                </form>
            
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </ListPageLayout>
  );
};

export default EmployeeManagement;

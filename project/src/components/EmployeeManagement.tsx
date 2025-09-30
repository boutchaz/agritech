import React, { useEffect, useState } from 'react';
import { Plus, X, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
}

const employeeSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  cin: z.string().min(3, 'CIN invalide'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  hire_date: z.string().min(1, "Date d'embauche requise"),
  position: z.string().min(1, 'Poste requis'),
  salary: z.coerce.number().nonnegative('Salaire invalide'),
  status: z.union([z.literal('active'), z.literal('inactive')]),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const EmployeeManagement: React.FC = () => {
  const { currentFarm, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const farmId = currentFarm?.id;
  const currency = currentOrganization?.currency || 'EUR';

  const emptyDefaults: EmployeeFormValues = {
    first_name: '',
    last_name: '',
    cin: '',
    phone: '',
    address: '',
    hire_date: new Date().toISOString().split('T')[0],
    position: '',
    salary: 0,
    status: 'active',
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any,
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
      });
    } else if (showAddModal) {
      form.reset(emptyDefaults);
    }
  }, [editingEmployee, showAddModal]);

  const employeesQuery = useQuery({
    queryKey: ['employees', farmId],
    queryFn: async (): Promise<Employee[]> => {
      if (!farmId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, phone, position, hire_date, salary, status, cin:employee_id, address:notes, farm_id')
        .eq('farm_id', farmId)
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!farmId,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      if (!farmId) {
        throw new Error('Aucune ferme sélectionnée. Veuillez sélectionner une ferme.');
      }
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        employee_id: values.cin,
        phone: values.phone || null,
        position: values.position,
        hire_date: values.hire_date,
        salary: values.salary,
        status: values.status,
        notes: values.address || null,
        farm_id: farmId,
      };
      const { data, error } = await supabase
        .from('employees')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', farmId] });
      setShowAddModal(false);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EmployeeFormValues }) => {
      if (!farmId) {
        throw new Error('Aucune ferme sélectionnée. Veuillez sélectionner une ferme.');
      }
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        employee_id: values.cin,
        phone: values.phone || null,
        position: values.position,
        hire_date: values.hire_date,
        salary: values.salary,
        status: values.status,
        notes: values.address || null,
      };
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', id)
        .eq('farm_id', farmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', farmId] });
      setEditingEmployee(null);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!farmId) {
        throw new Error('Aucune ferme sélectionnée.');
      }
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('farm_id', farmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', farmId] });
    },
  });

  if (employeesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Salariés
        </h2>
        <button
          onClick={() => { if (!farmId) return; setEditingEmployee(null); setShowAddModal(true); form.reset(emptyDefaults); }}
          disabled={!farmId}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${farmId ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
          title={!farmId ? 'Sélectionnez une ferme pour ajouter un salarié' : undefined}
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau Salarié</span>
        </button>
      </div>
      {!farmId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-amber-800 dark:text-amber-300 text-sm">
          Sélectionnez une ferme pour gérer les salariés.
        </div>
      )}

      {employeesQuery.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">Impossible de charger les salariés.</p>
        </div>
      )}

      {employeesQuery.data && employeesQuery.data.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <Calendar className="h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Aucun salarié pour l’instant.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ajouter votre premier salarié
          </button>
        </div>
      )}

      {/* Employees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employeesQuery.data?.map(employee => (
          <div
            key={employee.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {employee.first_name} {employee.last_name}
                </h3>
                <p className="text-sm text-gray-500">{employee.position}</p>
              </div>
              <div className="flex space-x-2">
                 <button
                  onClick={() => { setShowAddModal(true); setEditingEmployee(employee); }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
                      deleteEmployeeMutation.mutate(employee.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">CIN</span>
                <span>{employee.cin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Téléphone</span>
                <span>{employee.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date d'embauche</span>
                <span>{new Date(employee.hire_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Salaire</span>
                <span>{employee.salary.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statut</span>
                <span className={`${
                  employee.status === 'active' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {employee.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingEmployee ? 'Modifier le Salarié' : 'Nouveau Salarié'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Prénom" htmlFor="emp_first_name" error={form.formState.errors.first_name?.message as string}>
                      <Input id="emp_first_name" type="text" {...form.register('first_name')} />
                    </FormField>
                    <FormField label="Nom" htmlFor="emp_last_name" error={form.formState.errors.last_name?.message as string}>
                      <Input id="emp_last_name" type="text" {...form.register('last_name')} />
                    </FormField>
                  </div>

                  <FormField label="CIN" htmlFor="emp_cin" error={form.formState.errors.cin?.message as string}>
                    <Input id="emp_cin" type="text" {...form.register('cin')} />
                  </FormField>

                  <FormField label="Téléphone" htmlFor="emp_phone" error={form.formState.errors.phone?.message as string}>
                    <Input id="emp_phone" type="tel" {...form.register('phone')} />
                  </FormField>

                  <FormField label="Adresse" htmlFor="emp_address" error={form.formState.errors.address?.message as string}>
                    <Input id="emp_address" type="text" {...form.register('address')} />
                  </FormField>

                  <FormField label="Date d'embauche" htmlFor="emp_hire_date" error={form.formState.errors.hire_date?.message as string}>
                    <Input id="emp_hire_date" type="date" {...form.register('hire_date')} />
                  </FormField>

                  <FormField label="Poste" htmlFor="emp_position" error={form.formState.errors.position?.message as string}>
                    <Input id="emp_position" type="text" {...form.register('position')} />
                  </FormField>

                  <FormField label={`Salaire (${currency})`} htmlFor="emp_salary" error={form.formState.errors.salary?.message as string}>
                    <Input id="emp_salary" type="number" step={1} placeholder={`Salaire en ${currency}`} {...form.register('salary', { valueAsNumber: true })} />
                  </FormField>

                  <FormField label="Statut" htmlFor="emp_status" error={form.formState.errors.status?.message as string}>
                    <Select id="emp_status" {...form.register('status' as const)}>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </Select>
                  </FormField>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingEmployee(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={addEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-60"
                    >
                      {editingEmployee ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                  </div>
                </form>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

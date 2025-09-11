import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  cin: string;
  phone: string;
  address: string;
  hire_date: string;
  position: string;
  salary: number;
  status: 'active' | 'inactive';
}

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    cin: '',
    phone: '',
    address: '',
    hire_date: new Date().toISOString().split('T')[0],
    position: '',
    salary: 0,
    status: 'active' as const
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('farm_id', DEFAULT_FARM_ID)
        .order('last_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          farm_id: DEFAULT_FARM_ID
        }])
        .select()
        .single();

      if (error) throw error;

      setEmployees([...employees, data]);
      setShowAddModal(false);
      setNewEmployee({
        first_name: '',
        last_name: '',
        cin: '',
        phone: '',
        address: '',
        hire_date: new Date().toISOString().split('T')[0],
        position: '',
        salary: 0,
        status: 'active'
      });
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('Failed to add employee');
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update(editingEmployee)
        .eq('id', editingEmployee.id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setEmployees(employees.map(emp => 
        emp.id === editingEmployee.id ? editingEmployee : emp
      ));
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      setError('Failed to delete employee');
    }
  };

  if (loading) {
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
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau Salarié</span>
        </button>
      </div>

      {/* Employees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(employee => (
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
                  onClick={() => setEditingEmployee(employee)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteEmployee(employee.id)}
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
                <span>{employee.salary.toFixed(2)} DH</span>
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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={editingEmployee?.first_name || newEmployee.first_name}
                    onChange={(e) => {
                      if (editingEmployee) {
                        setEditingEmployee({
                          ...editingEmployee,
                          first_name: e.target.value
                        });
                      } else {
                        setNewEmployee({
                          ...newEmployee,
                          first_name: e.target.value
                        });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={editingEmployee?.last_name || newEmployee.last_name}
                    onChange={(e) => {
                      if (editingEmployee) {
                        setEditingEmployee({
                          ...editingEmployee,
                          last_name: e.target.value
                        });
                      } else {
                        setNewEmployee({
                          ...newEmployee,
                          last_name: e.target.value
                        });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CIN
                </label>
                <input
                  type="text"
                  value={editingEmployee?.cin || newEmployee.cin}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        cin: e.target.value
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        cin: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editingEmployee?.phone || newEmployee.phone}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        phone: e.target.value
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        phone: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse
                </label>
                <input
                  type="text"
                  value={editingEmployee?.address || newEmployee.address}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        address: e.target.value
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        address: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date d'embauche
                </label>
                <input
                  type="date"
                  value={editingEmployee?.hire_date || newEmployee.hire_date}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        hire_date: e.target.value
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        hire_date: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Poste
                </label>
                <input
                  type="text"
                  value={editingEmployee?.position || newEmployee.position}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        position: e.target.value
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        position: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Salaire (DH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingEmployee?.salary || newEmployee.salary}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        salary: Number(e.target.value)
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        salary: Number(e.target.value)
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Statut
                </label>
                <select
                  value={editingEmployee?.status || newEmployee.status}
                  onChange={(e) => {
                    if (editingEmployee) {
                      setEditingEmployee({
                        ...editingEmployee,
                        status: e.target.value as 'active' | 'inactive'
                      });
                    } else {
                      setNewEmployee({
                        ...newEmployee,
                        status: e.target.value as 'active' | 'inactive'
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                {editingEmployee ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
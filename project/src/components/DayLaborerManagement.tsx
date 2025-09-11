import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, User } from 'lucide-react';
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';

interface TaskCategory {
  id: string;
  name: string;
  description: string;
}

interface DayLaborerSpecialty {
  id: string;
  day_laborer_id: string;
  category_id: string;
  task_categories: {
    id: string;
    name: string;
  };
}

interface DayLaborer {
  id: string;
  first_name: string;
  last_name: string;
  cin: string;
  phone: string;
  address: string;
  daily_rate: number;
  task_rate: number | null;
  unit_rate: number | null;
  unit_type: string | null;
  payment_type: 'daily' | 'task' | 'unit';
  specialties?: DayLaborerSpecialty[];
  farm_id: string;
}

const DayLaborerManagement: React.FC = () => {
  const [laborers, setLaborers] = useState<DayLaborer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLaborer, setEditingLaborer] = useState<DayLaborer | null>(null);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [newLaborer, setNewLaborer] = useState<Partial<DayLaborer>>({
    first_name: '',
    last_name: '',
    cin: '',
    phone: '',
    address: '',
    daily_rate: 0,
    payment_type: 'daily',
    task_rate: null,
    unit_rate: null,
    unit_type: null
  });

  useEffect(() => {
    fetchLaborers();
    fetchTaskCategories();
  }, []);

  const fetchTaskCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setTaskCategories(data || []);
    } catch (error) {
      console.error('Error fetching task categories:', error);
      setError('Failed to fetch task categories');
    }
  };

  const fetchLaborers = async () => {
    try {
      const { data, error } = await supabase
        .from('day_laborers')
        .select(`
          *,
          specialties:day_laborer_specialties(
            id,
            category_id,
            task_categories(
              id,
              name
            )
          )
        `)
        .eq('farm_id', DEFAULT_FARM_ID)
        .order('last_name');

      if (error) throw error;
      setLaborers(data || []);
    } catch (error) {
      console.error('Error fetching laborers:', error);
      setError('Failed to fetch laborers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLaborer = async () => {
    try {
      const { data: laborer, error: laborerError } = await supabase
        .from('day_laborers')
        .insert([{ ...newLaborer, farm_id: DEFAULT_FARM_ID }])
        .select()
        .single();

      if (laborerError) throw laborerError;

      if (selectedSpecialties.length > 0) {
        const specialtiesData = selectedSpecialties.map(categoryId => ({
          day_laborer_id: laborer.id,
          category_id: categoryId
        }));

        const { error: specialtiesError } = await supabase
          .from('day_laborer_specialties')
          .insert(specialtiesData);

        if (specialtiesError) throw specialtiesError;
      }

      await fetchLaborers();

      setShowAddModal(false);
      setNewLaborer({
        first_name: '',
        last_name: '',
        cin: '',
        phone: '',
        address: '',
        daily_rate: 0,
        payment_type: 'daily',
        task_rate: null,
        unit_rate: null,
        unit_type: null
      });
      setSelectedSpecialties([]);
    } catch (error) {
      console.error('Error adding day laborer:', error);
      setError('Failed to add day laborer');
    }
  };

  const handleUpdateLaborer = async (laborer: DayLaborer) => {
    try {
      const { error } = await supabase
        .from('day_laborers')
        .update(laborer)
        .eq('id', laborer.id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setLaborers(laborers.map(l => l.id === laborer.id ? laborer : l));
      setEditingLaborer(null);
    } catch (error) {
      console.error('Error updating laborer:', error);
      setError('Failed to update laborer');
    }
  };

  const handleDeleteLaborer = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ouvrier ?')) return;

    try {
      const { error } = await supabase
        .from('day_laborers')
        .delete()
        .eq('id', id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setLaborers(laborers.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting laborer:', error);
      setError('Failed to delete laborer');
    }
  };

  const renderSpecialtiesSelect = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Spécialités
      </label>
      <select
        multiple
        value={selectedSpecialties}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, option => option.value);
          setSelectedSpecialties(values);
        }}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        size={5}
      >
        {taskCategories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500">
        Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs spécialités
      </p>
    </div>
  );

  const renderSpecialties = (laborer: DayLaborer) => {
    if (!laborer.specialties?.length) return null;

    return (
      <div className="mt-2">
        <p className="font-medium">Spécialités:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {laborer.specialties.map((specialty) => (
            <span
              key={specialty.id}
              className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs"
            >
              {specialty.task_categories.name}
            </span>
          ))}
        </div>
      </div>
    );
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Ouvriers Journaliers
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvel Ouvrier</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {laborers.map(laborer => (
          <div
            key={laborer.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <User className="h-10 w-10 text-gray-400" />
                <div>
                  <h3 className="text-lg font-semibold">
                    {laborer.first_name} {laborer.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    CIN: {laborer.cin}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingLaborer(laborer)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteLaborer(laborer.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {laborer.phone && (
                <p className="text-gray-600 dark:text-gray-300">
                  Tél: {laborer.phone}
                </p>
              )}
              {laborer.address && (
                <p className="text-gray-600 dark:text-gray-300">
                  Adresse: {laborer.address}
                </p>
              )}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="font-medium">Type de paiement: {laborer.payment_type === 'daily' ? 'Journalier' : laborer.payment_type === 'task' ? 'Par tâche' : 'Par unité'}</p>
                {laborer.payment_type === 'daily' && (
                  <p>Taux journalier: {laborer.daily_rate} DH</p>
                )}
                {laborer.payment_type === 'task' && laborer.task_rate && (
                  <p>Taux par tâche: {laborer.task_rate} DH</p>
                )}
                {laborer.payment_type === 'unit' && laborer.unit_rate && (
                  <p>Taux par {laborer.unit_type}: {laborer.unit_rate} DH</p>
                )}
              </div>
              {renderSpecialties(laborer)}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouvel Ouvrier
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                    value={newLaborer.first_name}
                    onChange={(e) => setNewLaborer({ ...newLaborer, first_name: e.target.value })}
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
                    value={newLaborer.last_name}
                    onChange={(e) => setNewLaborer({ ...newLaborer, last_name: e.target.value })}
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
                  value={newLaborer.cin}
                  onChange={(e) => setNewLaborer({ ...newLaborer, cin: e.target.value })}
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
                  value={newLaborer.phone}
                  onChange={(e) => setNewLaborer({ ...newLaborer, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse
                </label>
                <input
                  type="text"
                  value={newLaborer.address}
                  onChange={(e) => setNewLaborer({ ...newLaborer, address: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de paiement
                </label>
                <select
                  value={newLaborer.payment_type}
                  onChange={(e) => setNewLaborer({
                    ...newLaborer,
                    payment_type: e.target.value as 'daily' | 'task' | 'unit'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="daily">Journalier</option>
                  <option value="task">Par tâche</option>
                  <option value="unit">Par unité</option>
                </select>
              </div>

              {newLaborer.payment_type === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Taux journalier (DH)
                  </label>
                  <input
                    type="number"
                    value={newLaborer.daily_rate}
                    onChange={(e) => setNewLaborer({ ...newLaborer, daily_rate: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {newLaborer.payment_type === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Taux par tâche (DH)
                  </label>
                  <input
                    type="number"
                    value={newLaborer.task_rate || ''}
                    onChange={(e) => setNewLaborer({ ...newLaborer, task_rate: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {newLaborer.payment_type === 'unit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type d'unité
                    </label>
                    <input
                      type="text"
                      value={newLaborer.unit_type || ''}
                      onChange={(e) => setNewLaborer({ ...newLaborer, unit_type: e.target.value })}
                      placeholder="Ex: kg, caisse, arbre..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Taux par unité (DH)
                    </label>
                    <input
                      type="number"
                      value={newLaborer.unit_rate || ''}
                      onChange={(e) => setNewLaborer({ ...newLaborer, unit_rate: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </>
              )}

              {renderSpecialtiesSelect()}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddLaborer}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLaborer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Modifier l'Ouvrier
              </h3>
              <button
                onClick={() => setEditingLaborer(null)}
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
                    value={editingLaborer.first_name}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      first_name: e.target.value
                    })}
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
                    value={editingLaborer.last_name}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      last_name: e.target.value
                    })}
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
                  value={editingLaborer.cin}
                  onChange={(e) => setEditingLaborer({
                    ...editingLaborer,
                    cin: e.target.value
                  })}
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
                  value={editingLaborer.phone}
                  onChange={(e) => setEditingLaborer({
                    ...editingLaborer,
                    phone: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse
                </label>
                <input
                  type="text"
                  value={editingLaborer.address}
                  onChange={(e) => setEditingLaborer({
                    ...editingLaborer,
                    address: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de paiement
                </label>
                <select
                  value={editingLaborer.payment_type}
                  onChange={(e) => setEditingLaborer({
                    ...editingLaborer,
                    payment_type: e.target.value as 'daily' | 'task' | 'unit'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="daily">Journalier</option>
                  <option value="task">Par tâche</option>
                  <option value="unit">Par unité</option>
                </select>
              </div>

              {editingLaborer.payment_type === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Taux journalier (DH)
                  </label>
                  <input
                    type="number"
                    value={editingLaborer.daily_rate}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      daily_rate: Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {editingLaborer.payment_type === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Taux par tâche (DH)
                  </label>
                  <input
                    type="number"
                    value={editingLaborer.task_rate || ''}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      task_rate: Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {editingLaborer.payment_type === 'unit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type d'unité
                    </label>
                    <input
                      type="text"
                      value={editingLaborer.unit_type || ''}
                      onChange={(e) => setEditingLaborer({
                        ...editingLaborer,
                        unit_type: e.target.value
                      })}
                      placeholder="Ex: kg, caisse, arbre..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Taux par unité (DH)
                    </label>
                    <input
                      type="number"
                      value={editingLaborer.unit_rate || ''}
                      onChange={(e) => setEditingLaborer({
                        ...editingLaborer,
                        unit_rate: Number(e.target.value)
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </>
              )}

              {renderSpecialtiesSelect()}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingLaborer(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => handleUpdateLaborer(editingLaborer)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayLaborerManagement;
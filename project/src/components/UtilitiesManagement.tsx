import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Zap, Droplets, Fuel, Wifi, Phone } from 'lucide-react';
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';

interface Utility {
  id: string;
  type: 'electricity' | 'water' | 'diesel' | 'gas' | 'internet' | 'phone' | 'other';
  amount: number;
  date: string;
  notes: string | null;
}

const UTILITY_TYPES = [
  { value: 'electricity', label: 'Électricité', icon: Zap },
  { value: 'water', label: 'Eau', icon: Droplets },
  { value: 'diesel', label: 'Diesel', icon: Fuel },
  { value: 'gas', label: 'Gaz', icon: Fuel },
  { value: 'internet', label: 'Internet', icon: Wifi },
  { value: 'phone', label: 'Téléphone', icon: Phone },
  { value: 'other', label: 'Autre', icon: Plus }
];

const UtilitiesManagement: React.FC = () => {
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);

  const [newUtility, setNewUtility] = useState<Partial<Utility>>({
    type: 'electricity',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchUtilities();
  }, []);

  const fetchUtilities = async () => {
    try {
      const { data, error } = await supabase
        .from('utilities')
        .select('*')
        .eq('farm_id', DEFAULT_FARM_ID)
        .order('date', { ascending: false });

      if (error) throw error;
      setUtilities(data || []);
    } catch (error) {
      console.error('Error fetching utilities:', error);
      setError('Failed to fetch utilities');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUtility = async () => {
    try {
      const { data, error } = await supabase
        .from('utilities')
        .insert([{
          ...newUtility,
          farm_id: DEFAULT_FARM_ID
        }])
        .select()
        .single();

      if (error) throw error;

      setUtilities([data, ...utilities]);
      setShowAddModal(false);
      setNewUtility({
        type: 'electricity',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error('Error adding utility:', error);
      setError('Failed to add utility');
    }
  };

  const handleUpdateUtility = async () => {
    if (!editingUtility) return;

    try {
      const { error } = await supabase
        .from('utilities')
        .update(editingUtility)
        .eq('id', editingUtility.id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setUtilities(utilities.map(util => 
        util.id === editingUtility.id ? editingUtility : util
      ));
      setEditingUtility(null);
    } catch (error) {
      console.error('Error updating utility:', error);
      setError('Failed to update utility');
    }
  };

  const handleDeleteUtility = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) return;

    try {
      const { error } = await supabase
        .from('utilities')
        .delete()
        .eq('id', id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setUtilities(utilities.filter(util => util.id !== id));
    } catch (error) {
      console.error('Error deleting utility:', error);
      setError('Failed to delete utility');
    }
  };

  const getUtilityIcon = (type: string) => {
    const utilityType = UTILITY_TYPES.find(ut => ut.value === type);
    const Icon = utilityType?.icon || Plus;
    return <Icon className="h-6 w-6" />;
  };

  const getUtilityLabel = (type: string) => {
    return UTILITY_TYPES.find(ut => ut.value === type)?.label || type;
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Charges Fixes
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Charge</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {utilities.map(utility => (
          <div
            key={utility.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg
                  ${utility.type === 'electricity' ? 'bg-yellow-100 text-yellow-600' :
                    utility.type === 'water' ? 'bg-blue-100 text-blue-600' :
                    utility.type === 'diesel' ? 'bg-red-100 text-red-600' :
                    utility.type === 'gas' ? 'bg-orange-100 text-orange-600' :
                    utility.type === 'internet' ? 'bg-indigo-100 text-indigo-600' :
                    utility.type === 'phone' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'}
                `}>
                  {getUtilityIcon(utility.type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {getUtilityLabel(utility.type)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(utility.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingUtility(utility)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteUtility(utility.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Montant</span>
                <span className="text-lg font-semibold">{utility.amount.toFixed(2)} DH</span>
              </div>
              {utility.notes && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {utility.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUtility) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingUtility ? 'Modifier la Charge' : 'Nouvelle Charge'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUtility(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de charge
                </label>
                <select
                  value={editingUtility?.type || newUtility.type}
                  onChange={(e) => {
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        type: e.target.value as Utility['type']
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        type: e.target.value as Utility['type']
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  {UTILITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Montant (DH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUtility?.amount || newUtility.amount}
                  onChange={(e) => {
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        amount: Number(e.target.value)
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        amount: Number(e.target.value)
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={editingUtility?.date || newUtility.date}
                  onChange={(e) => {
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        date: e.target.value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        date: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={editingUtility?.notes || newUtility.notes}
                  onChange={(e) => {
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        notes: e.target.value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        notes: e.target.value
                      });
                    }
                  }}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUtility(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={editingUtility ? handleUpdateUtility : handleAddUtility}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                {editingUtility ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitiesManagement;
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Edit2, Trash2, Zap, Droplets, Fuel, Wifi, Phone, Grid, List, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';

interface Utility {
  id: string;
  farm_id: string;
  type: 'electricity' | 'water' | 'diesel' | 'gas' | 'internet' | 'phone' | 'other';
  provider?: string;
  account_number?: string;
  amount: number;
  billing_date: string;
  due_date?: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  is_recurring?: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  notes?: string;
  created_at: string;
  updated_at: string;
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
  const { currentOrganization, currentFarm } = useAuth();
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'grouped' | 'list'>('grouped');

  const [newUtility, setNewUtility] = useState<Partial<Utility>>({
    type: 'electricity',
    amount: 0,
    billing_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    is_recurring: false,
    recurring_frequency: 'monthly',
    notes: ''
  });

  useEffect(() => {
    fetchUtilities();
  }, [currentFarm?.id]);

  // Group utilities by type
  const groupedUtilities = useMemo(() => {
    const groups: Record<string, Utility[]> = {};
    utilities.forEach(utility => {
      if (!groups[utility.type]) {
        groups[utility.type] = [];
      }
      groups[utility.type].push(utility);
    });
    return groups;
  }, [utilities]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = utilities.reduce((sum, utility) => sum + utility.amount, 0);
    const recurringAmount = utilities
      .filter(u => u.is_recurring)
      .reduce((sum, utility) => sum + utility.amount, 0);
    const pendingAmount = utilities
      .filter(u => u.payment_status === 'pending')
      .reduce((sum, utility) => sum + utility.amount, 0);

    return {
      total: totalAmount,
      recurring: recurringAmount,
      pending: pendingAmount,
      count: utilities.length
    };
  }, [utilities]);

  const fetchUtilities = async () => {
    try {
      if (!currentFarm?.id) {
        setUtilities([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('utilities')
        .select('*')
        .eq('farm_id', currentFarm.id)
        .order('billing_date', { ascending: false });

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
      if (!currentFarm?.id) {
        setError('Sélectionnez une ferme pour ajouter une charge.');
        return;
      }

      const { data, error } = await supabase
        .from('utilities')
        .insert([{
          ...newUtility,
          farm_id: currentFarm.id
        }])
        .select()
        .single();

      if (error) throw error;

      setUtilities([data, ...utilities]);
      setShowAddModal(false);
      setNewUtility({
        type: 'electricity',
        amount: 0,
        billing_date: new Date().toISOString().split('T')[0],
        payment_status: 'pending',
        is_recurring: false,
        recurring_frequency: 'monthly',
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
        .eq('farm_id', currentFarm?.id);

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
        .eq('farm_id', currentFarm?.id);

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
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 rounded-md ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue groupée"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue cartes"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue liste"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            disabled={!currentFarm?.id}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${currentFarm?.id ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            title={!currentFarm?.id ? 'Sélectionnez une ferme pour ajouter une charge' : undefined}
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle Charge</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {utilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total des charges</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.total.toFixed(2)} DH</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Charges récurrentes</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.recurring.toFixed(2)} DH</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Edit2 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En attente</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.pending.toFixed(2)} DH</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <List className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre total</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentFarm?.id && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-amber-800 dark:text-amber-300 text-sm">
          Sélectionnez une ferme pour gérer les charges fixes.
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {utilities.length === 0 && !loading && currentFarm?.id && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Zap className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune charge fixe
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Commencez par ajouter vos premières charges fixes (électricité, eau, etc.)
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une charge
          </button>
        </div>
      )}

      {/* Utilities Display */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {Object.entries(groupedUtilities).map(([type, typeUtilities]) => {
            const typeTotal = typeUtilities.reduce((sum, u) => sum + u.amount, 0);
            const typeRecurring = typeUtilities.filter(u => u.is_recurring).length;

            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                        type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                        type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                        type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                        type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {getUtilityIcon(type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {getUtilityLabel(type)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {typeUtilities.length} entrée{typeUtilities.length !== 1 ? 's' : ''}
                          {typeRecurring > 0 && ` • ${typeRecurring} récurrente${typeRecurring !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {typeTotal.toFixed(2)} DH
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Total
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {typeUtilities.map(utility => (
                    <div key={utility.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {utility.amount.toFixed(2)} DH
                          </span>
                          {utility.is_recurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <Calendar className="h-3 w-3 mr-1" />
                              Récurrent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(utility.billing_date).toLocaleDateString()}
                          {utility.notes && ` • ${utility.notes}`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingUtility(utility)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUtility(utility.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {utilities.map(utility => (
            <div
              key={utility.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    utility.type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    utility.type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                    utility.type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    utility.type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                    utility.type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                    utility.type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {getUtilityIcon(utility.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getUtilityLabel(utility.type)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(utility.billing_date).toLocaleDateString()}
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
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{utility.amount.toFixed(2)} DH</span>
                </div>
                {utility.is_recurring && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Récurrent ({utility.recurring_frequency})
                    </span>
                  </div>
                )}
                {utility.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {utility.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {utilities.map(utility => (
                <tr key={utility.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        utility.type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        utility.type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                        utility.type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                        utility.type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                        utility.type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                        utility.type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {getUtilityIcon(utility.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUtilityLabel(utility.type)}
                        </div>
                        {utility.is_recurring && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Récurrent ({utility.recurring_frequency})
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {utility.amount.toFixed(2)} DH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(utility.billing_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      utility.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      utility.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {utility.payment_status === 'paid' ? 'Payé' :
                       utility.payment_status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingUtility(utility)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUtility(utility.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  value={editingUtility?.billing_date || newUtility.billing_date}
                  onChange={(e) => {
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        billing_date: e.target.value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        billing_date: e.target.value
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUtility?.is_recurring || newUtility.is_recurring || false}
                    onChange={(e) => {
                      if (editingUtility) {
                        setEditingUtility({
                          ...editingUtility,
                          is_recurring: e.target.checked
                        });
                      } else {
                        setNewUtility({
                          ...newUtility,
                          is_recurring: e.target.checked
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Charge récurrente
                  </span>
                </label>
              </div>

              {(editingUtility?.is_recurring || newUtility.is_recurring) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fréquence
                  </label>
                  <select
                    value={editingUtility?.recurring_frequency || newUtility.recurring_frequency}
                    onChange={(e) => {
                      if (editingUtility) {
                        setEditingUtility({
                          ...editingUtility,
                          recurring_frequency: e.target.value as 'monthly' | 'quarterly' | 'yearly'
                        });
                      } else {
                        setNewUtility({
                          ...newUtility,
                          recurring_frequency: e.target.value as 'monthly' | 'quarterly' | 'yearly'
                        });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="monthly">Mensuelle</option>
                    <option value="quarterly">Trimestrielle</option>
                    <option value="yearly">Annuelle</option>
                  </select>
                </div>
              )}

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
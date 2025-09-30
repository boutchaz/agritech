import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Plus, Loader2, PieChart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { Cost, Revenue } from '../types/cost-tracking';
import { formatCurrency } from '../utils/currencies';

interface ParcelProfitabilityProps {
  parcelId: string;
  parcelName: string;
}

const ParcelProfitability: React.FC<ParcelProfitabilityProps> = ({ parcelId, parcelName }) => {
  const { currentOrganization, user } = useAuth();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);

  const [newCost, setNewCost] = useState({
    cost_type: 'materials' as const,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  const [newRevenue, setNewRevenue] = useState({
    revenue_type: 'harvest' as const,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    crop_type: '',
    quantity: 0,
    unit: 'kg',
    price_per_unit: 0,
    description: '',
    notes: ''
  });

  // Fetch costs
  const { data: costs = [], isLoading: costsLoading } = useQuery({
    queryKey: ['costs', parcelId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('costs')
        .select('*, category:cost_categories(name, type)')
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Cost[];
    },
    enabled: !!parcelId
  });

  // Fetch revenues
  const { data: revenues = [], isLoading: revenuesLoading } = useQuery({
    queryKey: ['revenues', parcelId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!parcelId
  });

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: async (costData: typeof newCost) => {
      if (!currentOrganization) throw new Error('No organization');

      const { data, error } = await supabase
        .from('costs')
        .insert({
          organization_id: currentOrganization.id,
          parcel_id: parcelId,
          ...costData,
          currency: currentOrganization.currency || 'EUR',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs', parcelId] });
      setShowAddCost(false);
      setNewCost({
        cost_type: 'materials',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        notes: ''
      });
    }
  });

  // Add revenue mutation
  const addRevenueMutation = useMutation({
    mutationFn: async (revenueData: typeof newRevenue) => {
      if (!currentOrganization) throw new Error('No organization');

      const { data, error } = await supabase
        .from('revenues')
        .insert({
          organization_id: currentOrganization.id,
          parcel_id: parcelId,
          ...revenueData,
          currency: currentOrganization.currency || 'EUR',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues', parcelId] });
      setShowAddRevenue(false);
      setNewRevenue({
        revenue_type: 'harvest',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        crop_type: '',
        quantity: 0,
        unit: 'kg',
        price_per_unit: 0,
        description: '',
        notes: ''
      });
    }
  });

  // Calculate totals
  const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const totalRevenue = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0);
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Cost breakdown
  const costBreakdown = costs.reduce((acc, cost) => {
    acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
    return acc;
  }, {} as Record<string, number>);

  const isLoading = costsLoading || revenuesLoading;
  const currency = currentOrganization?.currency || 'EUR';

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddCost(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Coût</span>
          </button>
          <button
            onClick={() => setShowAddRevenue(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Revenu</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Coûts Totaux
                </span>
                <DollarSign className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalCosts, currency)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Revenus Totaux
                </span>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalRevenue, currency)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Bénéfice Net
                </span>
                {netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit, currency)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Marge
                </span>
                <PieChart className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          {Object.keys(costBreakdown).length > 0 && (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Répartition des Coûts
              </h3>
              <div className="space-y-3">
                {Object.entries(costBreakdown).map(([type, amount]) => {
                  const percentage = (amount / totalCosts) * 100;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(amount, currency)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Costs */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Coûts Récents
              </h3>
              {costs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  Aucun coût enregistré
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {costs.slice(0, 10).map((cost) => (
                    <div key={cost.id} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {cost.description || cost.cost_type}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(cost.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(cost.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenues */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenus Récents
              </h3>
              {revenues.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  Aucun revenu enregistré
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {revenues.slice(0, 10).map((revenue) => (
                    <div key={revenue.id} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {revenue.description || revenue.revenue_type}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(revenue.date).toLocaleDateString()}
                          {revenue.quantity && ` • ${revenue.quantity} ${revenue.unit}`}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(revenue.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Cost Modal */}
      {showAddCost && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Ajouter un Coût
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newCost.cost_type}
                  onChange={(e) => setNewCost({ ...newCost, cost_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="materials">Matériaux</option>
                  <option value="labor">Main-d'œuvre</option>
                  <option value="utilities">Services publics</option>
                  <option value="equipment">Équipement</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Montant
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={newCost.amount}
                    onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">{currency}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newCost.date}
                  onChange={(e) => setNewCost({ ...newCost, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCost.description}
                  onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Achat de semences"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddCost(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => addCostMutation.mutate(newCost)}
                disabled={addCostMutation.isPending || !newCost.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {addCostMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Revenue Modal */}
      {showAddRevenue && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Ajouter un Revenu
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newRevenue.revenue_type}
                  onChange={(e) => setNewRevenue({ ...newRevenue, revenue_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="harvest">Récolte</option>
                  <option value="subsidy">Subvention</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Montant
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={newRevenue.amount}
                    onChange={(e) => setNewRevenue({ ...newRevenue, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">{currency}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newRevenue.date}
                  onChange={(e) => setNewRevenue({ ...newRevenue, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRevenue.quantity}
                    onChange={(e) => setNewRevenue({ ...newRevenue, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    value={newRevenue.unit}
                    onChange={(e) => setNewRevenue({ ...newRevenue, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="kg, tonnes..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newRevenue.description}
                  onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Récolte d'olives"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddRevenue(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => addRevenueMutation.mutate(newRevenue)}
                disabled={addRevenueMutation.isPending || !newRevenue.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
              >
                {addRevenueMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParcelProfitability;

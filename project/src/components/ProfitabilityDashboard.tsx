import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Filter, Download, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { ProfitabilityData, Cost, Revenue } from '../types/cost-tracking';
import { formatCurrency } from '../utils/currencies';

const ProfitabilityDashboard: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParcel, setSelectedParcel] = useState<string>('all');

  // Fetch parcels
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const { data, error } = await supabase
        .from('parcels')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization
  });

  // Fetch costs
  const { data: costs = [], isLoading: costsLoading } = useQuery({
    queryKey: ['costs', currentOrganization?.id, selectedParcel, startDate, endDate],
    queryFn: async () => {
      if (!currentOrganization) return [];
      let query = supabase
        .from('costs')
        .select('*, parcel:parcels(id, name), category:cost_categories(name, type)')
        .eq('organization_id', currentOrganization.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedParcel !== 'all') {
        query = query.eq('parcel_id', selectedParcel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cost[];
    },
    enabled: !!currentOrganization
  });

  // Fetch revenues
  const { data: revenues = [], isLoading: revenuesLoading } = useQuery({
    queryKey: ['revenues', currentOrganization?.id, selectedParcel, startDate, endDate],
    queryFn: async () => {
      if (!currentOrganization) return [];
      let query = supabase
        .from('revenues')
        .select('*, parcel:parcels(id, name)')
        .eq('organization_id', currentOrganization.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedParcel !== 'all') {
        query = query.eq('parcel_id', selectedParcel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!currentOrganization
  });

  // Calculate profitability metrics
  const profitabilityData = useMemo(() => {
    const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const totalRevenue = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0);
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Cost breakdown by type
    const costBreakdown = costs.reduce((acc, cost) => {
      acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
      return acc;
    }, {} as Record<string, number>);

    // Revenue breakdown by type
    const revenueBreakdown = revenues.reduce((acc, rev) => {
      acc[rev.revenue_type] = (acc[rev.revenue_type] || 0) + Number(rev.amount);
      return acc;
    }, {} as Record<string, number>);

    // Group by parcel
    const byParcel: Record<string, ProfitabilityData> = {};

    costs.forEach(cost => {
      const parcelId = cost.parcel_id || 'unassigned';
      const parcelName = cost.parcel?.name || 'Non assigné';
      if (!byParcel[parcelId]) {
        byParcel[parcelId] = {
          parcel_id: cost.parcel_id,
          parcel_name: parcelName,
          total_costs: 0,
          total_revenue: 0,
          net_profit: 0,
          cost_breakdown: {},
          revenue_breakdown: {}
        };
      }
      byParcel[parcelId].total_costs += Number(cost.amount);
      byParcel[parcelId].cost_breakdown[cost.cost_type] =
        (byParcel[parcelId].cost_breakdown[cost.cost_type] || 0) + Number(cost.amount);
    });

    revenues.forEach(rev => {
      const parcelId = rev.parcel_id || 'unassigned';
      const parcelName = rev.parcel?.name || 'Non assigné';
      if (!byParcel[parcelId]) {
        byParcel[parcelId] = {
          parcel_id: rev.parcel_id,
          parcel_name: parcelName,
          total_costs: 0,
          total_revenue: 0,
          net_profit: 0,
          cost_breakdown: {},
          revenue_breakdown: {}
        };
      }
      byParcel[parcelId].total_revenue += Number(rev.amount);
      byParcel[parcelId].revenue_breakdown[rev.revenue_type] =
        (byParcel[parcelId].revenue_breakdown[rev.revenue_type] || 0) + Number(rev.amount);
    });

    // Calculate net profit and margin for each parcel
    Object.values(byParcel).forEach(parcel => {
      parcel.net_profit = parcel.total_revenue - parcel.total_costs;
      parcel.profit_margin = parcel.total_revenue > 0
        ? (parcel.net_profit / parcel.total_revenue) * 100
        : undefined;
    });

    return {
      totalCosts,
      totalRevenue,
      netProfit,
      profitMargin,
      costBreakdown,
      revenueBreakdown,
      byParcel: Object.values(byParcel)
    };
  }, [costs, revenues]);

  const isLoading = costsLoading || revenuesLoading;
  const currency = currentOrganization?.currency || 'EUR';
  const currencySymbol = currentOrganization?.currency_symbol || '€';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analyse de Rentabilité
          </h2>
        </div>
        <button
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          <span>Exporter</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Parcelle
            </label>
            <select
              value={selectedParcel}
              onChange={(e) => setSelectedParcel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Toutes les parcelles</option>
              {parcels.map(parcel => (
                <option key={parcel.id} value={parcel.id}>{parcel.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Coûts Totaux
                </span>
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(profitabilityData.totalCosts, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {costs.length} entrées
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Revenus Totaux
                </span>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(profitabilityData.totalRevenue, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {revenues.length} entrées
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Bénéfice Net
                </span>
                {profitabilityData.netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className={`text-2xl font-bold ${
                profitabilityData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(profitabilityData.netProfit, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {profitabilityData.netProfit >= 0 ? 'Profitable' : 'En perte'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Marge Bénéficiaire
                </span>
                <PieChart className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {profitabilityData.profitMargin.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {profitabilityData.profitMargin > 20 ? 'Excellente' :
                 profitabilityData.profitMargin > 10 ? 'Bonne' :
                 profitabilityData.profitMargin > 0 ? 'Moyenne' : 'Faible'}
              </div>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Répartition des Coûts
              </h3>
              <div className="space-y-3">
                {Object.entries(profitabilityData.costBreakdown).map(([type, amount]) => {
                  const percentage = (amount / profitabilityData.totalCosts) * 100;
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
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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

            {/* Revenue Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Répartition des Revenus
              </h3>
              <div className="space-y-3">
                {Object.entries(profitabilityData.revenueBreakdown).map(([type, amount]) => {
                  const percentage = (amount / profitabilityData.totalRevenue) * 100;
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
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* By Parcel Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rentabilité par Parcelle
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Parcelle
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Coûts
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Revenus
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Bénéfice Net
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Marge
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {profitabilityData.byParcel.map((parcel, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {parcel.parcel_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                        {formatCurrency(parcel.total_costs, currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                        {formatCurrency(parcel.total_revenue, currency)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        parcel.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(parcel.net_profit, currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {parcel.profit_margin !== undefined ? `${parcel.profit_margin.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitabilityDashboard;
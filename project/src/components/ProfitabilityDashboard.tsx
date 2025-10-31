import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Filter, Download, Loader2, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { ProfitabilityData, Cost, Revenue } from '../types/cost-tracking';
import { useCurrency } from '../hooks/useCurrency';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/Input';
import { NativeSelect } from './ui/NativeSelect';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { useExperienceLevel, useFeatureFlag } from '../contexts/ExperienceLevelContext';
import { AdaptiveSection } from './adaptive/AdaptiveSection';
import { Badge } from './ui/badge';

const ProfitabilityDashboard: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();

  // Experience level hooks
  const { level, config } = useExperienceLevel();
  const showExport = useFeatureFlag('showDataExport');
  const showAnalytics = useFeatureFlag('showAnalytics');
  const showAdvancedFilters = useFeatureFlag('showAdvancedFilters');
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
  // Currency is now managed by useCurrency hook

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analyse de Rentabilité
          </h2>
          {/* Experience level indicator */}
          <Badge variant={level === 'expert' ? 'default' : level === 'medium' ? 'secondary' : 'outline'}>
            <Sparkles className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        {/* Only show export button for medium/expert */}
        {showExport && (
          <Button className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date de début
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date de fin
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                Parcelle
              </Label>
              <NativeSelect
                value={selectedParcel}
                onChange={(e) => setSelectedParcel(e.target.value)}
              >
                <option value="all">Toutes les parcelles</option>
                {parcels.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>{parcel.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Coûts Totaux
                  </span>
                  <DollarSign className="h-5 w-5 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(profitabilityData.totalCosts)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {costs.length} entrées
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Revenus Totaux
                  </span>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(profitabilityData.totalRevenue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {revenues.length} entrées
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
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
                  {formatCurrency(profitabilityData.netProfit)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {profitabilityData.netProfit >= 0 ? 'Profitable' : 'En perte'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Charts - Only for Medium/Expert */}
          {showAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Répartition des Coûts
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      Analyse avancée
                    </Badge>
                  </div>
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
                            {formatCurrency(amount)} ({percentage.toFixed(1)}%)
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
              </CardContent>
            </Card>

              {/* Revenue Breakdown */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Répartition des Revenus
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      Analyse avancée
                    </Badge>
                  </div>
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
                            {formatCurrency(amount)} ({percentage.toFixed(1)}%)
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
              </CardContent>
            </Card>
            </div>
          )}

          {/* Upgrade prompt for Basic users */}
          {!showAnalytics && (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Analyses avancées disponibles
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Passez au niveau <strong>Intermédiaire</strong> pour débloquer les graphiques de répartition détaillés et l'export de données.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/settings/preferences'}
                >
                  Changer de niveau
                </Button>
              </CardContent>
            </Card>
          )}

          {/* By Parcel Table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Rentabilité par Parcelle
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Parcelle</TableHead>
                      <TableHead className="text-right">Coûts</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                      <TableHead className="text-right">Bénéfice Net</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitabilityData.byParcel.map((parcel, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{parcel.parcel_name}</TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {formatCurrency(parcel.total_costs)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(parcel.total_revenue)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          parcel.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(parcel.net_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {parcel.profit_margin !== undefined ? `${parcel.profit_margin.toFixed(1)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProfitabilityDashboard;
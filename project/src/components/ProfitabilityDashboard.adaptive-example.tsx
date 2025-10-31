/**
 * EXAMPLE: Adaptive UI Integration in ProfitabilityDashboard
 *
 * This file demonstrates how to integrate the adaptive UI system.
 * Copy these patterns into your actual components.
 *
 * Key Changes:
 * 1. Wrap with useExperienceLevel and useFeatureFlag hooks
 * 2. Use AdaptiveSection for advanced features
 * 3. Add ContextualHelp hints for basic/medium users
 * 4. Track feature usage for smart suggestions
 * 5. Conditionally show export/analytics based on level
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type { ProfitabilityData, Cost, Revenue } from '@/types/cost-tracking';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ⭐ NEW: Import adaptive UI components
import { useExperienceLevel, useFeatureFlag } from '@/contexts/ExperienceLevelContext';
import { AdaptiveSection, ContextualHelp, LevelUpSuggestion } from '@/components/adaptive';
import type { ContextualHint } from '@/types/experience-level';

const ProfitabilityDashboard: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();

  // ⭐ NEW: Access experience level
  const { level, trackFeatureUsage } = useExperienceLevel();

  // ⭐ NEW: Check feature flags
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

  // ⭐ NEW: Advanced filter states (only used if feature enabled)
  const [minProfit, setMinProfit] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'margin'>('name');

  // Fetch parcels
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const { data, error } = await supabase.from('parcels').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization,
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
    enabled: !!currentOrganization,
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
    enabled: !!currentOrganization,
  });

  // Calculate profitability metrics
  const profitabilityData = useMemo(() => {
    const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const totalRevenue = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0);
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const costBreakdown = costs.reduce((acc, cost) => {
      acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
      return acc;
    }, {} as Record<string, number>);

    const revenueBreakdown = revenues.reduce((acc, rev) => {
      acc[rev.revenue_type] = (acc[rev.revenue_type] || 0) + Number(rev.amount);
      return acc;
    }, {} as Record<string, number>);

    const byParcel: Record<string, ProfitabilityData> = {};

    costs.forEach((cost) => {
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
          revenue_breakdown: {},
        };
      }
      byParcel[parcelId].total_costs += Number(cost.amount);
      byParcel[parcelId].cost_breakdown[cost.cost_type] =
        (byParcel[parcelId].cost_breakdown[cost.cost_type] || 0) + Number(cost.amount);
    });

    revenues.forEach((rev) => {
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
          revenue_breakdown: {},
        };
      }
      byParcel[parcelId].total_revenue += Number(rev.amount);
      byParcel[parcelId].revenue_breakdown[rev.revenue_type] =
        (byParcel[parcelId].revenue_breakdown[rev.revenue_type] || 0) + Number(rev.amount);
    });

    Object.values(byParcel).forEach((parcel) => {
      parcel.net_profit = parcel.total_revenue - parcel.total_costs;
      parcel.profit_margin =
        parcel.total_revenue > 0 ? (parcel.net_profit / parcel.total_revenue) * 100 : undefined;
    });

    // ⭐ NEW: Apply advanced filters if enabled
    let filteredByParcel = Object.values(byParcel);
    if (showAdvancedFilters) {
      if (minProfit !== undefined) {
        filteredByParcel = filteredByParcel.filter((p) => p.net_profit >= minProfit);
      }
      filteredByParcel.sort((a, b) => {
        switch (sortBy) {
          case 'profit':
            return b.net_profit - a.net_profit;
          case 'margin':
            return (b.profit_margin || 0) - (a.profit_margin || 0);
          default:
            return a.parcel_name.localeCompare(b.parcel_name);
        }
      });
    }

    return {
      totalCosts,
      totalRevenue,
      netProfit,
      profitMargin,
      costBreakdown,
      revenueBreakdown,
      byParcel: filteredByParcel,
    };
  }, [costs, revenues, showAdvancedFilters, minProfit, sortBy]);

  const isLoading = costsLoading || revenuesLoading;

  // ⭐ NEW: Define contextual hints
  const hints: ContextualHint[] = [
    {
      id: 'profitability-filters',
      title: 'Filtrer par période',
      content:
        'Utilisez les filtres de date pour analyser la rentabilité sur une période spécifique. Par défaut, les 3 derniers mois sont affichés.',
      targetLevel: ['basic', 'medium'],
      category: 'tip',
      priority: 'medium',
    },
    {
      id: 'profitability-export',
      title: 'Exporter vos données',
      content:
        "Cliquez sur 'Exporter' pour télécharger un fichier CSV de vos données de rentabilité. Utile pour l'analyse dans Excel ou d'autres outils.",
      targetLevel: ['medium'],
      category: 'feature',
      priority: 'low',
    },
  ];

  // ⭐ NEW: Handle export with usage tracking
  const handleExport = () => {
    trackFeatureUsage('profitability-export');
    // Actual export logic here...
    console.log('Exporting profitability data...');
  };

  return (
    <div className="p-6 space-y-6">
      {/* ⭐ NEW: Show level-up suggestion */}
      <LevelUpSuggestion />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analyse de Rentabilité
          </h2>
        </div>
        {/* ⭐ NEW: Only show export if feature is enabled */}
        {showExport && (
          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>

      {/* ⭐ NEW: Contextual help hint */}
      <ContextualHelp hint={hints[0]} />

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date de début
              </Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date de fin
              </Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                {parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* ⭐ NEW: Advanced filters in collapsible section */}
          {showAdvancedFilters && (
            <AdaptiveSection
              title="Filtres avancés"
              description="Options de filtrage et de tri supplémentaires"
              collapsible={level !== 'expert'}
              defaultExpanded={false}
              className="mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Bénéfice minimum</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1000"
                    value={minProfit || ''}
                    onChange={(e) => setMinProfit(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Trier par</Label>
                  <NativeSelect
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="name">Nom</option>
                    <option value="profit">Bénéfice</option>
                    <option value="margin">Marge</option>
                  </NativeSelect>
                </div>
              </div>
            </AdaptiveSection>
          )}
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
            {/* ... same card content as before ... */}
          </div>

          {/* ⭐ NEW: Analytics section - only if feature enabled */}
          {showAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Répartition des Coûts
                  </h3>
                  {/* ... breakdown content ... */}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Répartition des Revenus
                  </h3>
                  {/* ... breakdown content ... */}
                </CardContent>
              </Card>
            </div>
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
                        <TableCell
                          className={`text-right font-medium ${
                            parcel.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(parcel.net_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {parcel.profit_margin !== undefined
                            ? `${parcel.profit_margin.toFixed(1)}%`
                            : '-'}
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

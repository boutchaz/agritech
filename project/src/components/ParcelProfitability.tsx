import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Loader2,
  PieChart,
  BarChart3,
  TrendingUpIcon,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import type { Cost, Revenue } from '../types/cost-tracking';
import { useCurrency } from '../hooks/useCurrency';
import { useProfitabilityData, useJournalEntriesForParcel } from '../hooks/useProfitabilityQuery';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/Input';
import { NativeSelect } from './ui/NativeSelect';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { useTranslation } from 'react-i18next';
import { accountingApi } from '../lib/accounting-api';
import { Checkbox } from './ui/checkbox';

interface ParcelProfitabilityProps {
  parcelId: string;
  parcelName: string;
}

const ParcelProfitability: React.FC<ParcelProfitabilityProps> = ({ parcelId }) => {
  const { t } = useTranslation();
  const { currentOrganization, user } = useAuth();
  const { format: formatCurrency, currencyCode, symbol: currencySymbol } = useCurrency();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [createJournalEntry, setCreateJournalEntry] = useState(true);
  const [expandedJournalEntry, setExpandedJournalEntry] = useState<string | null>(null);

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

  // Fetch comprehensive profitability data (ledger + legacy)
  const {
    data: profitabilityData,
    isLoading: profitabilityLoading,
  } = useProfitabilityData(
    parcelId,
    startDate,
    endDate,
    currentOrganization?.id || ''
  );

  // Fetch journal entries for detailed view
  const {
    data: journalEntries = [],
    isLoading: journalEntriesLoading,
  } = useJournalEntriesForParcel(
    parcelId,
    startDate,
    endDate,
    currentOrganization?.id || ''
  );

  // Legacy data for backward compatibility
  const costs = profitabilityData?.costs || [];
  const revenues = profitabilityData?.revenues || [];

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: async (costData: typeof newCost) => {
      if (!currentOrganization || !user) throw new Error('No organization or user');

      // Insert cost
      const { data: cost, error } = await supabase
        .from('costs')
        .insert({
          organization_id: currentOrganization.id,
          parcel_id: parcelId,
          ...costData,
          currency: currencyCode,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create journal entry if enabled
      if (createJournalEntry) {
        try {
          // Get expense account (you may need to adjust account codes based on your chart of accounts)
          const { data: expenseAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('organization_id', currentOrganization.id)
            .eq('type', 'expense')
            .eq('code', '6000') // Farming expenses account
            .limit(1);

          // Get cash/bank account
          const { data: cashAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('organization_id', currentOrganization.id)
            .eq('type', 'asset')
            .eq('code', '1000') // Cash account
            .limit(1);

          if (expenseAccounts?.[0] && cashAccounts?.[0]) {
            await accountingApi.createJournalEntry(
              {
                entry_date: new Date(costData.date),
                posting_date: new Date(costData.date),
                reference: `COST-${cost.id}`,
                description: costData.description || `${costData.cost_type} cost`,
                items: [
                  {
                    account_id: expenseAccounts[0].id,
                    debit: costData.amount,
                    credit: 0,
                    description: costData.description || `${costData.cost_type} cost`
                  },
                  {
                    account_id: cashAccounts[0].id,
                    debit: 0,
                    credit: costData.amount,
                    description: `Payment for ${costData.description || costData.cost_type}`
                  }
                ]
              },
              currentOrganization.id,
              user.id
            );
          }
        } catch (journalError) {
          console.error('Failed to create journal entry:', journalError);
          // Don't throw - cost was still created successfully
        }
      }

      return cost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['profitability', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-parcel', parcelId] });
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
      if (!currentOrganization || !user) throw new Error('No organization or user');

      // Insert revenue
      const { data: revenue, error } = await supabase
        .from('revenues')
        .insert({
          organization_id: currentOrganization.id,
          parcel_id: parcelId,
          ...revenueData,
          currency: currencyCode,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create journal entry if enabled
      if (createJournalEntry) {
        try {
          // Get revenue account
          const { data: revenueAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('organization_id', currentOrganization.id)
            .eq('type', 'revenue')
            .eq('code', '4000') // Sales/Revenue account
            .limit(1);

          // Get cash/bank account
          const { data: cashAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('organization_id', currentOrganization.id)
            .eq('type', 'asset')
            .eq('code', '1000') // Cash account
            .limit(1);

          if (revenueAccounts?.[0] && cashAccounts?.[0]) {
            await accountingApi.createJournalEntry(
              {
                entry_date: new Date(revenueData.date),
                posting_date: new Date(revenueData.date),
                reference: `REV-${revenue.id}`,
                description: revenueData.description || `${revenueData.revenue_type} revenue`,
                items: [
                  {
                    account_id: cashAccounts[0].id,
                    debit: revenueData.amount,
                    credit: 0,
                    description: `Receipt from ${revenueData.description || revenueData.revenue_type}`
                  },
                  {
                    account_id: revenueAccounts[0].id,
                    debit: 0,
                    credit: revenueData.amount,
                    description: revenueData.description || `${revenueData.revenue_type} revenue`
                  }
                ]
              },
              currentOrganization.id,
              user.id
            );
          }
        } catch (journalError) {
          console.error('Failed to create journal entry:', journalError);
          // Don't throw - revenue was still created successfully
        }
      }

      return revenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['profitability', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-parcel', parcelId] });
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

  // Use comprehensive profitability data
  const totalCosts = profitabilityData?.totalCosts || 0;
  const totalRevenue = profitabilityData?.totalRevenue || 0;
  const netProfit = profitabilityData?.netProfit || 0;
  const profitMargin = profitabilityData?.profitMargin || 0;

  // Cost breakdown (legacy for simple view)
  const costBreakdown = costs.reduce((acc, cost) => {
    acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
    return acc;
  }, {} as Record<string, number>);

  const isLoading = profitabilityLoading || journalEntriesLoading;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <Label className="mb-1">
              {t('profitability.filters.startDate')}
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="mb-1">
              {t('profitability.filters.endDate')}
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowAddCost(true)}
            variant="destructive"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('profitability.buttons.addCost')}
          </Button>
          <Button
            onClick={() => setShowAddRevenue(true)}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('profitability.buttons.addRevenue')}
          </Button>
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('profitability.summary.totalCosts')}
                  </span>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalCosts)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('profitability.summary.totalRevenue')}
                  </span>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('profitability.summary.netProfit')}
                  </span>
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('profitability.summary.margin')}
                  </span>
                  <PieChart className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {profitMargin.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          {Object.keys(costBreakdown).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profitability.costBreakdown.title')}
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
                            {formatCurrency(amount)} ({percentage.toFixed(1)}%)
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
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Costs */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profitability.recentTransactions.costs')}
                </h3>
                {costs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    {t('profitability.recentTransactions.noCosts')}
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
                          {formatCurrency(cost.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenues */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profitability.recentTransactions.revenues')}
                </h3>
                {revenues.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    {t('profitability.recentTransactions.noRevenues')}
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
                          {formatCurrency(revenue.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Profitability Analysis with Tabs */}
          {profitabilityData && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t('profitability.tabs.overview', 'Overview')}
                </TabsTrigger>
                <TabsTrigger value="accounts">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('profitability.tabs.accounts', 'Accounts')}
                </TabsTrigger>
                <TabsTrigger value="costCenters">
                  <Building2 className="h-4 w-4 mr-2" />
                  {t('profitability.tabs.costCenters', 'Cost Centers')}
                </TabsTrigger>
                <TabsTrigger value="journal">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('profitability.tabs.journal', 'Journal Entries')}
                </TabsTrigger>
                <TabsTrigger value="trends">
                  <TrendingUpIcon className="h-4 w-4 mr-2" />
                  {t('profitability.tabs.trends', 'Trends')}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('profitability.overview.title', 'Financial Overview')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('profitability.overview.legacyCosts', 'Legacy Costs')}
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            (profitabilityData?.costs || []).reduce((sum, c) => sum + Number(c.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('profitability.overview.legacyRevenue', 'Legacy Revenue')}
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            (profitabilityData?.revenues || []).reduce((sum, r) => sum + Number(r.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('profitability.overview.ledgerExpenses', 'Ledger Expenses')}
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            (profitabilityData?.ledgerExpenses || []).reduce(
                              (sum, e) => sum + (Number(e.debit || 0) - Number(e.credit || 0)),
                              0
                            )
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('profitability.overview.ledgerRevenue', 'Ledger Revenue')}
                        </p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            (profitabilityData?.ledgerRevenues || []).reduce(
                              (sum, r) => sum + (Number(r.credit || 0) - Number(r.debit || 0)),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Accounts Tab */}
              <TabsContent value="accounts" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('profitability.accounts.title', 'Breakdown by Chart of Accounts')}
                    </h3>
                    {profitabilityData?.accountBreakdown?.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {t('profitability.accounts.noData', 'No ledger data available for this period')}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.code', 'Code')}
                              </th>
                              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.name', 'Account Name')}
                              </th>
                              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.type', 'Type')}
                              </th>
                              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.debit', 'Debit')}
                              </th>
                              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.credit', 'Credit')}
                              </th>
                              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {t('profitability.accounts.net', 'Net')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {profitabilityData?.accountBreakdown?.map((acc) => (
                              <tr
                                key={acc.account_code}
                                className="border-b border-gray-100 dark:border-gray-800"
                              >
                                <td className="py-3 px-2 text-sm font-mono text-gray-900 dark:text-white">
                                  {acc.account_code}
                                </td>
                                <td className="py-3 px-2 text-sm text-gray-900 dark:text-white">
                                  {acc.account_name}
                                </td>
                                <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                                  {acc.account_type}
                                </td>
                                <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(acc.total_debit)}
                                </td>
                                <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(acc.total_credit)}
                                </td>
                                <td
                                  className={`py-3 px-2 text-sm text-right font-semibold ${
                                    acc.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {formatCurrency(Math.abs(acc.net_amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cost Centers Tab */}
              <TabsContent value="costCenters" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('profitability.costCenters.title', 'Profitability by Cost Center')}
                    </h3>
                    {profitabilityData?.costCenterBreakdown?.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {t('profitability.costCenters.noData', 'No cost center data available')}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {profitabilityData?.costCenterBreakdown?.map((cc) => (
                          <Card key={cc.cost_center_name} className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {cc.cost_center_name}
                                </h4>
                                <span
                                  className={`text-lg font-bold ${
                                    cc.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {formatCurrency(cc.net_amount)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('profitability.costCenters.expenses', 'Expenses')}:
                                  </span>
                                  <span className="ml-2 text-red-600 font-medium">
                                    {formatCurrency(cc.expense_amount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('profitability.costCenters.revenue', 'Revenue')}:
                                  </span>
                                  <span className="ml-2 text-green-600 font-medium">
                                    {formatCurrency(cc.revenue_amount)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Journal Entries Tab */}
              <TabsContent value="journal" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('profitability.journal.title', 'Related Journal Entries')}
                    </h3>
                    {journalEntries.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {t('profitability.journal.noEntries', 'No journal entries found')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {journalEntries.map((entry: any) => (
                          <div
                            key={entry.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                          >
                            <div
                              className="flex justify-between items-start cursor-pointer"
                              onClick={() =>
                                setExpandedJournalEntry(
                                  expandedJournalEntry === entry.id ? null : entry.id
                                )
                              }
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                    {entry.entry_number}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(entry.entry_date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {entry.description}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(
                                    entry.journal_items.reduce(
                                      (sum: number, item: any) => sum + Number(item.debit),
                                      0
                                    )
                                  )}
                                </span>
                                {expandedJournalEntry === entry.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {expandedJournalEntry === entry.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-gray-600 dark:text-gray-400">
                                      <th className="pb-2">{t('profitability.journal.account', 'Account')}</th>
                                      <th className="pb-2 text-right">
                                        {t('profitability.journal.debit', 'Debit')}
                                      </th>
                                      <th className="pb-2 text-right">
                                        {t('profitability.journal.credit', 'Credit')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entry.journal_items.map((item: any) => (
                                      <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="py-2">
                                          <div>
                                            <span className="font-mono">{item.accounts?.code}</span>
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                              {item.accounts?.name}
                                            </span>
                                          </div>
                                          {item.description && (
                                            <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                                          )}
                                        </td>
                                        <td className="py-2 text-right">
                                          {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                                        </td>
                                        <td className="py-2 text-right">
                                          {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {t('profitability.trends.title', 'Monthly Profitability Trends')}
                    </h3>
                    {profitabilityData?.monthlyData?.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {t('profitability.trends.noData', 'No trend data available')}
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {profitabilityData?.monthlyData?.map((monthData) => (
                          <div key={monthData.month} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {new Date(monthData.month + '-01').toLocaleDateString('default', {
                                  year: 'numeric',
                                  month: 'long',
                                })}
                              </h4>
                              <span
                                className={`text-lg font-bold ${
                                  monthData.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(monthData.profit)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('profitability.trends.costs', 'Costs')}:
                                </span>
                                <span className="text-red-600 font-medium">{formatCurrency(monthData.costs)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('profitability.trends.revenue', 'Revenue')}:
                                </span>
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(monthData.revenue)}
                                </span>
                              </div>
                            </div>
                            {/* Visual bar */}
                            <div className="mt-2 h-8 flex rounded-lg overflow-hidden">
                              <div
                                className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                                style={{
                                  width: `${
                                    monthData.revenue + monthData.costs > 0
                                      ? (monthData.costs / (monthData.revenue + monthData.costs)) * 100
                                      : 50
                                  }%`,
                                }}
                              >
                                {monthData.costs > 0 && formatCurrency(monthData.costs)}
                              </div>
                              <div
                                className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                                style={{
                                  width: `${
                                    monthData.revenue + monthData.costs > 0
                                      ? (monthData.revenue / (monthData.revenue + monthData.costs)) * 100
                                      : 50
                                  }%`,
                                }}
                              >
                                {monthData.revenue > 0 && formatCurrency(monthData.revenue)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Add Cost Modal */}
      <Dialog open={showAddCost} onOpenChange={setShowAddCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profitability.addCost.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('profitability.addCost.type')}</Label>
              <NativeSelect
                value={newCost.cost_type}
                onChange={(e) => setNewCost({ ...newCost, cost_type: e.target.value as any })}
              >
                <option value="materials">{t('profitability.addCost.types.materials')}</option>
                <option value="labor">{t('profitability.addCost.types.labor')}</option>
                <option value="utilities">{t('profitability.addCost.types.utilities')}</option>
                <option value="equipment">{t('profitability.addCost.types.equipment')}</option>
                <option value="other">{t('profitability.addCost.types.other')}</option>
              </NativeSelect>
            </div>
            <div>
              <Label>{t('profitability.addCost.amount')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={newCost.amount}
                  onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>{t('profitability.addCost.date')}</Label>
              <Input
                type="date"
                value={newCost.date}
                onChange={(e) => setNewCost({ ...newCost, date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('profitability.addCost.description')}</Label>
              <Input
                type="text"
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                placeholder={t('profitability.addCost.placeholder')}
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="create-journal-entry-cost"
                checked={createJournalEntry}
                onCheckedChange={(checked) => setCreateJournalEntry(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="create-journal-entry-cost"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('profitability.addCost.createJournalEntry')}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t('profitability.addCost.journalEntryHelp')}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCost(false)}
            >
              {t('profitability.addCost.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => addCostMutation.mutate(newCost)}
              disabled={addCostMutation.isPending || !newCost.amount}
            >
              {addCostMutation.isPending ? t('profitability.addCost.adding') : t('profitability.addCost.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Revenue Modal */}
      <Dialog open={showAddRevenue} onOpenChange={setShowAddRevenue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profitability.addRevenue.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('profitability.addRevenue.type')}</Label>
              <NativeSelect
                value={newRevenue.revenue_type}
                onChange={(e) => setNewRevenue({ ...newRevenue, revenue_type: e.target.value as any })}
              >
                <option value="harvest">{t('profitability.addRevenue.types.harvest')}</option>
                <option value="subsidy">{t('profitability.addRevenue.types.subsidy')}</option>
                <option value="other">{t('profitability.addRevenue.types.other')}</option>
              </NativeSelect>
            </div>
            <div>
              <Label>{t('profitability.addRevenue.amount')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={newRevenue.amount}
                  onChange={(e) => setNewRevenue({ ...newRevenue, amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>{t('profitability.addRevenue.date')}</Label>
              <Input
                type="date"
                value={newRevenue.date}
                onChange={(e) => setNewRevenue({ ...newRevenue, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('profitability.addRevenue.quantity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newRevenue.quantity}
                  onChange={(e) => setNewRevenue({ ...newRevenue, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('profitability.addRevenue.unit')}</Label>
                <Input
                  type="text"
                  value={newRevenue.unit}
                  onChange={(e) => setNewRevenue({ ...newRevenue, unit: e.target.value })}
                  placeholder={t('profitability.addRevenue.unitPlaceholder')}
                />
              </div>
            </div>
            <div>
              <Label>{t('profitability.addRevenue.description')}</Label>
              <Input
                type="text"
                value={newRevenue.description}
                onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                placeholder={t('profitability.addRevenue.placeholder')}
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="create-journal-entry-revenue"
                checked={createJournalEntry}
                onCheckedChange={(checked) => setCreateJournalEntry(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="create-journal-entry-revenue"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('profitability.addRevenue.createJournalEntry')}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t('profitability.addRevenue.journalEntryHelp')}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddRevenue(false)}
            >
              {t('profitability.addRevenue.cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => addRevenueMutation.mutate(newRevenue)}
              disabled={addRevenueMutation.isPending || !newRevenue.amount}
            >
              {addRevenueMutation.isPending ? t('profitability.addRevenue.adding') : t('profitability.addRevenue.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParcelProfitability;

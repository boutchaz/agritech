import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Building2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Layers,
  ChevronLeft,
  Search,
} from 'lucide-react';
import { useProfitabilityAnalysis, type AnalysisFilterType } from '@/hooks/useProfitabilityQuery';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useParcelsWithDetails } from '@/hooks/useParcelsWithDetails';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatPercent = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

const AppContent: React.FC = () => {
  const { t } = useTranslation('accounting');
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<AnalysisFilterType>('organization');
  const [filterValue, setFilterValue] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Applied filters (only updated on button click)
  const [applied, setApplied] = useState<{
    filterType: AnalysisFilterType;
    filterValue: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const { data: farms = [] } = useFarms(orgId ?? undefined);
  const { data: parcelsWithDetails = [] } = useParcelsWithDetails();

  const allParcels = parcelsWithDetails as Array<{
    id: string;
    name: string;
    crop_type?: string | null;
    variety?: string | null;
  }>;

  const cropTypes = useMemo(
    () => [...new Set(allParcels.map((p) => p.crop_type).filter(Boolean))] as string[],
    [allParcels],
  );
  const varieties = useMemo(
    () => [...new Set(allParcels.map((p) => p.variety).filter(Boolean))] as string[],
    [allParcels],
  );

  const { data: analysis, isLoading, isError } = useProfitabilityAnalysis(
    applied
      ? {
          filter_type: applied.filterType,
          filter_value: applied.filterValue || undefined,
          start_date: applied.startDate,
          end_date: applied.endDate,
        }
      : { filter_type: undefined },
    orgId,
  );

  const handleApply = () => {
    setApplied({ filterType, filterValue, startDate, endDate });
  };

  const needsValue = filterType !== 'organization';

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  const kpiColor = (v: number) =>
    v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  return (
    <PageLayout
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: FileSpreadsheet, label: t('reports.title', 'Financial Reports'), path: '/accounting/reports' as any },
            { icon: BarChart3, label: t('reports.analysis.title', 'Analyse Multi-Filtres'), isActive: true },
          ]}
          title={t('reports.analysis.title', 'Analyse Financière Multi-Filtres')}
          subtitle={t('reports.analysis.subtitle', 'Analysez coûts et revenus par organisation, ferme, parcelle, culture ou variété')}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="text-gray-600 dark:text-gray-400 -ml-2"
          onClick={() => navigate({ to: '/accounting/reports' })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('common.back', 'Retour')}
        </Button>

        {/* Filter bar */}
        <Card className="border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              {t('reports.analysis.filters', "Filtres d'analyse")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              {/* Level selector */}
              <div className="space-y-1.5 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('reports.analysis.level', 'Niveau')}
                </label>
                <Select
                  value={filterType}
                  onValueChange={(v) => {
                    setFilterType(v as AnalysisFilterType);
                    setFilterValue('');
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">{t("reports.analysis.filterOrg", "Organisation")}</SelectItem>
                    <SelectItem value="farm">{t("reports.analysis.filterFarm", "Ferme")}</SelectItem>
                    <SelectItem value="parcel">{t("reports.analysis.filterParcel", "Parcelle")}</SelectItem>
                    <SelectItem value="crop_type">{t("reports.analysis.filterCrop", "Culture")}</SelectItem>
                    <SelectItem value="variety">{t("reports.analysis.filterVariety", "Variété")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Value selector — depends on filter type */}
              {needsValue && (
                <div className="space-y-1.5 min-w-[200px]">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {filterType === 'farm'
                      ? t('reports.analysis.selectFarm', 'Ferme')
                      : filterType === 'parcel'
                      ? t('reports.analysis.selectParcel', 'Parcelle')
                      : filterType === 'crop_type'
                      ? t('reports.analysis.selectCrop', 'Culture')
                      : t('reports.analysis.selectVariety', 'Variété')}
                  </label>
                  {filterType === 'farm' ? (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('reports.analysis.selectFarm', 'Choisir une ferme')} />
                      </SelectTrigger>
                      <SelectContent>
                        {farms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : filterType === 'parcel' ? (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('reports.analysis.selectParcel', 'Choisir une parcelle')} />
                      </SelectTrigger>
                      <SelectContent>
                        {allParcels.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : filterType === 'crop_type' ? (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('reports.analysis.selectCrop', 'Choisir une culture')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cropTypes.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('reports.analysis.selectVariety', 'Choisir une variété')} />
                      </SelectTrigger>
                      <SelectContent>
                        {varieties.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Date range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('reports.analysis.from', 'Du')}
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-36"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('reports.analysis.to', 'Au')}
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-36"
                />
              </div>

              <Button
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApply}
                disabled={needsValue && !filterValue}
              >
                <Search className="h-4 w-4 mr-1.5" />
                {t('reports.analysis.analyze', 'Analyser')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {!applied && (
          <div className="flex flex-col items-center justify-center h-48 border rounded-lg border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30">
            <BarChart3 className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('reports.analysis.selectFilters', 'Sélectionnez des filtres et cliquez sur Analyser')}
            </p>
          </div>
        )}

        {applied && isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        )}

        {applied && isError && (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-500">{t("common.error", "Erreur lors du chargement des données")}</p>
          </div>
        )}

        {applied && !isLoading && analysis && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  label: t('reports.analysis.totalRevenue', 'Revenus totaux'),
                  value: formatCurrency(analysis.total_revenue),
                  icon: TrendingUp,
                  color: 'text-emerald-600 dark:text-emerald-400',
                  bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                  border: 'border-emerald-200 dark:border-emerald-800/50',
                },
                {
                  label: t('reports.analysis.totalCosts', 'Coûts totaux'),
                  value: formatCurrency(analysis.total_costs),
                  icon: TrendingDown,
                  color: 'text-red-600 dark:text-red-400',
                  bg: 'bg-red-50 dark:bg-red-950/40',
                  border: 'border-red-200 dark:border-red-800/50',
                },
                {
                  label: t('reports.analysis.netProfit', 'Bénéfice net'),
                  value: formatCurrency(analysis.net_profit),
                  icon: BarChart3,
                  color: kpiColor(analysis.net_profit),
                  bg: analysis.net_profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40',
                  border: analysis.net_profit >= 0 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-red-200 dark:border-red-800/50',
                },
                {
                  label: t('reports.analysis.margin', 'Marge'),
                  value: formatPercent(analysis.margin_percent),
                  icon: Layers,
                  color: kpiColor(analysis.margin_percent),
                  bg: analysis.margin_percent >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40',
                  border: analysis.margin_percent >= 0 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-red-200 dark:border-red-800/50',
                },
                {
                  label: t('reports.analysis.parcels', 'Parcelles'),
                  value: String(analysis.parcel_count),
                  icon: FileSpreadsheet,
                  color: 'text-blue-600 dark:text-blue-400',
                  bg: 'bg-blue-50 dark:bg-blue-950/40',
                  border: 'border-blue-200 dark:border-blue-800/50',
                },
              ].map((kpi) => {
                const KpiIcon = kpi.icon;
                return (
                  <Card key={kpi.label} className={`border ${kpi.border} ${kpi.bg} shadow-sm`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {kpi.label}
                          </p>
                          <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                        </div>
                        <div className={`rounded-xl p-2 ${kpi.bg}`}>
                          <KpiIcon className={`h-5 w-5 ${kpi.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Cost & Revenue breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cost breakdown */}
              <Card className="border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {t('reports.analysis.costBreakdown', 'Répartition des coûts')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { key: 'labor', label: t('reports.analysis.labor', "Main d'oeuvre") },
                      { key: 'materials', label: t('reports.analysis.materials', 'Matériaux') },
                      { key: 'product_applications', label: t('reports.analysis.products', 'Produits appliqués') },
                      { key: 'equipment', label: t('reports.analysis.equipment', 'Équipement') },
                      { key: 'other', label: t('reports.analysis.other', 'Autres') },
                    ].map(({ key, label }) => {
                      const val = analysis.cost_breakdown[key as keyof typeof analysis.cost_breakdown] || 0;
                      const pct = analysis.total_costs > 0 ? (val / analysis.total_costs) * 100 : 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{label}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {formatCurrency(val)} <span className="text-xs text-gray-400">({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 dark:bg-red-500 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue breakdown */}
              <Card className="border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {t('reports.analysis.revenueBreakdown', 'Répartition des revenus')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { key: 'harvest', label: t('reports.analysis.harvest', 'Récoltes') },
                      { key: 'invoiced', label: t('reports.analysis.invoiced', 'Facturé (comptabilité)') },
                      { key: 'other', label: t('reports.analysis.other', 'Autres') },
                    ].map(({ key, label }) => {
                      const val = analysis.revenue_breakdown[key as keyof typeof analysis.revenue_breakdown] || 0;
                      const pct = analysis.total_revenue > 0 ? (val / analysis.total_revenue) * 100 : 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{label}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {formatCurrency(val)} <span className="text-xs text-gray-400">({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* By parcel table */}
            {analysis.by_parcel.length > 0 && (
              <Card className="border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {t('reports.analysis.byParcel', 'Détail par parcelle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t("reports.analysis.parcel", "Parcelle")}</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t("reports.analysis.crop", "Culture")}</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t("reports.analysis.revenue", "Revenus")}</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t("reports.analysis.costs", "Coûts")}</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t("reports.analysis.profit", "Bénéfice")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.by_parcel.map((row, idx) => (
                          <tr
                            key={row.parcel_id}
                            className={`border-b border-gray-50 dark:border-gray-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{row.parcel_name}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                              {row.crop_type || '—'}
                              {row.variety && <span className="ml-1 text-xs text-gray-400">({row.variety})</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatCurrency(row.revenue)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                              {formatCurrency(row.costs)}
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${kpiColor(row.profit)}`}>
                              {formatCurrency(row.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                          <td colSpan={2} className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                            {t('reports.analysis.total', 'Total')}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(analysis.total_revenue)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(analysis.total_costs)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${kpiColor(analysis.net_profit)}`}>
                            {formatCurrency(analysis.net_profit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.by_parcel.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 border rounded-lg border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('reports.analysis.noData', 'Aucune donnée pour cette sélection sur la période choisie')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/reports-analysis')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});

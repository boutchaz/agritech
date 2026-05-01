import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Loader2, Users, AlertTriangle } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useLeaveBalanceSummary, useWorkforceSummary } from '@/hooks/useHrAdvanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/hr-analytics')({
  component: withRouteProtection(HrAnalyticsPage, 'read', 'Worker'),
});

function HrAnalyticsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const farms = useFarms(orgId ?? undefined);
  const workforce = useWorkforceSummary(orgId);
  const balances = useLeaveBalanceSummary(orgId);

  const totals = useMemo(() => {
    const data = workforce.data ?? [];
    return data.reduce(
      (acc, row) => ({
        fixed: acc.fixed + Number(row.fixed_salary_count || 0),
        daily: acc.daily + Number(row.daily_worker_count || 0),
        metayage: acc.metayage + Number(row.metayage_count || 0),
        female: acc.female + Number(row.female_count || 0),
        cnss: acc.cnss + Number(row.cnss_covered_count || 0),
      }),
      { fixed: 0, daily: 0, metayage: 0, female: 0, cnss: 0 },
    );
  }, [workforce.data]);

  const totalWorkers = totals.fixed + totals.daily + totals.metayage;
  const cnssCoverage = totalWorkers > 0 ? Math.round((totals.cnss / totalWorkers) * 100) : 0;
  const femaleShare = totalWorkers > 0 ? Math.round((totals.female / totalWorkers) * 100) : 0;

  const lowBalanceWorkers = useMemo(
    () => (balances.data ?? []).filter((b) => b.remaining_days < 5 && b.total_days > 0),
    [balances.data],
  );

  if (!orgId) return null;

  const farmName = (id: string | null) => {
    if (!id) return t('hrAnalytics.allFarms', 'All farms');
    return (farms.data ?? []).find((f) => f.id === id)?.name ?? '—';
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold">{t('hrAnalytics.title', 'HR Analytics')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('hrAnalytics.subtitle', 'Workforce composition, CNSS coverage, leave balances.')}
        </p>
      </header>

      {workforce.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t('hrAnalytics.totalWorkers', 'Total workers')} value={totalWorkers} />
            <StatCard label={t('hrAnalytics.cnssCoverage', 'CNSS coverage')} value={`${cnssCoverage}%`} />
            <StatCard label={t('hrAnalytics.femaleShare', 'Female workers')} value={`${femaleShare}%`} />
            <StatCard label={t('hrAnalytics.lowBalance', 'Low leave balance')} value={lowBalanceWorkers.length} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('hrAnalytics.compositionByFarm', 'Composition by farm')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!workforce.data?.length ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  {t('hrAnalytics.noData', 'No workforce data yet.')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="py-2 pr-3">{t('hrAnalytics.farm', 'Farm')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.fixed', 'Fixed')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.daily', 'Daily')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.metayage', 'Métayage')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.female', 'Female')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.cnss', 'CNSS')}</th>
                        <th className="py-2 px-2 text-right">{t('hrAnalytics.avgDaily', 'Avg daily')}</th>
                        <th className="py-2 pl-2 text-right">{t('hrAnalytics.avgMonthly', 'Avg monthly')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workforce.data.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 pr-3">{farmName(row.farm_id)}</td>
                          <td className="py-2 px-2 text-right">{row.fixed_salary_count}</td>
                          <td className="py-2 px-2 text-right">{row.daily_worker_count}</td>
                          <td className="py-2 px-2 text-right">{row.metayage_count}</td>
                          <td className="py-2 px-2 text-right">{row.female_count}</td>
                          <td className="py-2 px-2 text-right">{row.cnss_covered_count}</td>
                          <td className="py-2 px-2 text-right">
                            {row.avg_daily_rate != null ? Number(row.avg_daily_rate).toFixed(0) : '—'}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {row.avg_monthly_salary != null ? Number(row.avg_monthly_salary).toFixed(0) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {t('hrAnalytics.lowBalanceTitle', 'Workers with < 5 days leave remaining')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balances.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : !lowBalanceWorkers.length ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  {t('hrAnalytics.noLowBalance', 'All balances healthy.')}
                </p>
              ) : (
                <div className="space-y-1">
                  {lowBalanceWorkers.map((b) => (
                    <div
                      key={`${b.worker_id}-${b.leave_type}`}
                      className="flex items-center justify-between gap-3 text-sm py-1.5 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>
                          {b.first_name} {b.last_name}
                        </span>
                        <Badge variant="secondary">{b.leave_type}</Badge>
                      </div>
                      <span className="text-xs">
                        <strong>{b.remaining_days}</strong> / {b.total_days} {t('common.days', 'days')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-500 font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import ReactECharts from 'echarts-for-react';
import { DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';

function SubscriptionsPage() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: () => adminApi.getSaasMetrics(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((skIdx) => (
              <div key={"sk-" + skIdx} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">Failed to load subscription data</p>
        </div>
      </div>
    );
  }

  // Plan breakdown chart
  const planChartOption = {
    title: {
      text: 'Revenue by Plan',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
        data: (metrics?.planBreakdown || []).map((plan: any) => ({
          value: plan.mrr,
          name: plan.planType || 'Unknown',
        })),
      },
    ],
  };

  // Organizations per plan bar chart
  const orgsChartOption = {
    title: {
      text: 'Organizations per Plan',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: (metrics?.planBreakdown || []).map((p: any) => p.planType || 'Unknown'),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: (metrics?.planBreakdown || []).map((p: any) => p.count),
        type: 'bar',
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-gray-600">Revenue and subscription analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.totalMrr || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Annual Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.totalArr || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ARPU</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.arpu || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Plans</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.planBreakdown?.length || 0}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={planChartOption} style={{ height: '350px' }} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={orgsChartOption} style={{ height: '350px' }} />
        </div>
      </div>

      {/* Plan Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Plan Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organizations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  % of Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(metrics?.planBreakdown || []).map((plan: any) => (
                <tr key={plan.planType} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium capitalize">
                      {plan.planType || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{plan.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {formatCurrency(plan.mrr)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {metrics?.totalMrr
                      ? ((plan.mrr / metrics.totalMrr) * 100).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/subscriptions')({
  component: SubscriptionsPage,
});

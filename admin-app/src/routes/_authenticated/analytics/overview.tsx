import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import ReactECharts from 'echarts-for-react';
import { format, subDays } from 'date-fns';
import { AlertCircle } from 'lucide-react';

function AnalyticsOverviewPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: () => adminApi.getSaasMetrics(),
  });

  const { data: dailyCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['daily-event-counts'],
    queryFn: () => adminApi.getDailyEventCounts(30),
  });

  const { data: eventDistribution, isLoading: distLoading } = useQuery({
    queryKey: ['event-distribution'],
    queryFn: () => adminApi.getEventDistribution(30),
  });

  const isLoading = metricsLoading || countsLoading || distLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare daily activity chart data
  const activityChartOption = {
    title: {
      text: 'Daily Activity (Last 30 Days)',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dailyCounts?.map((d: any) => format(new Date(d.date), 'MMM d')) || [],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: dailyCounts?.map((d: any) => d.count) || [],
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        lineStyle: {
          width: 2,
        },
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

  // Prepare event distribution pie chart
  const eventPieOption = {
    title: {
      text: 'Event Distribution',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
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
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: (eventDistribution || []).slice(0, 10).map((d: any) => ({
          value: d.count,
          name: d.event_type,
        })),
      },
    ],
  };

  // Plan breakdown bar chart
  const planChartOption = {
    title: {
      text: 'Subscriptions by Plan',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: metrics?.planBreakdown?.map((p: any) => p.planType || 'Unknown') || [],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: metrics?.planBreakdown?.map((p: any) => p.count) || [],
        type: 'bar',
        itemStyle: {
          color: '#10b981',
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
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-gray-600">Platform usage and activity metrics</p>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <ReactECharts option={activityChartOption} style={{ height: '300px' }} />
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={eventPieOption} style={{ height: '300px' }} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={planChartOption} style={{ height: '300px' }} />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/overview')({
  component: AnalyticsOverviewPage,
});

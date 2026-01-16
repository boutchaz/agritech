import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { TrendingDown, Users, Clock, Target, ChevronDown } from 'lucide-react';

function AdoptionAnalyticsPage() {
  const [selectedFunnel, setSelectedFunnel] = useState('user_onboarding');

  const { data: funnels, isLoading: funnelsLoading } = useQuery({
    queryKey: ['available-funnels'],
    queryFn: () => adminApi.getAvailableFunnels(),
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['adoption-dashboard', selectedFunnel],
    queryFn: () => adminApi.getAdoptionDashboard(selectedFunnel),
    enabled: !!selectedFunnel,
  });

  const isLoading = funnelsLoading || dashboardLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const conversionRates = dashboardData?.conversion_rates || [];
  const dropoffAnalysis = dashboardData?.dropoff_analysis || [];
  const timeToMilestone = dashboardData?.time_to_milestone || [];

  // Funnel chart option
  const funnelChartOption = {
    title: {
      text: 'User Adoption Funnel',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const stage = conversionRates.find((c: any) => c.stage_name === params.name);
        return `${params.name}<br/>Users: ${stage?.users_reached || 0}<br/>Conversion: ${stage?.conversion_rate_percent || 0}%`;
      },
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        width: '80%',
        top: 60,
        bottom: 60,
        sort: 'none',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const stage = conversionRates.find((c: any) => c.stage_name === params.name);
            return `${params.name}\n${stage?.users_reached || 0} users`;
          },
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: 'solid',
          },
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 14,
          },
        },
        data: conversionRates.map((stage: any, index: number) => ({
          value: stage.users_reached || 0,
          name: stage.stage_name,
          itemStyle: {
            color: `hsl(${210 - index * 20}, 70%, ${50 + index * 5}%)`,
          },
        })),
      },
    ],
  };

  // Conversion rate bar chart
  const conversionBarOption = {
    title: {
      text: 'Stage-to-Stage Conversion Rates',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>Conversion Rate: ${data.value}%`;
      },
    },
    xAxis: {
      type: 'category',
      data: conversionRates.map((c: any) => c.stage_name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series: [
      {
        data: conversionRates.map((c: any) => c.stage_conversion_rate || 100),
        type: 'bar',
        itemStyle: {
          color: (params: any) => {
            const value = params.value;
            if (value >= 80) return '#10b981';
            if (value >= 60) return '#f59e0b';
            return '#ef4444';
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      containLabel: true,
    },
  };

  // Time to milestone chart
  const timeChartOption = {
    title: {
      text: 'Average Time to Milestone (Hours)',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>Avg: ${data.value}h<br/>Median: ${timeToMilestone.find((t: any) => t.stage_name === data.name)?.median_hours_to_complete || 0}h`;
      },
    },
    xAxis: {
      type: 'category',
      data: timeToMilestone.map((t: any) => t.stage_name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Hours',
    },
    series: [
      {
        data: timeToMilestone.map((t: any) => t.avg_hours_to_complete || 0),
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          color: '#8b5cf6',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      containLabel: true,
    },
  };

  // Drop-off analysis chart
  const dropoffChartOption = {
    title: {
      text: 'Drop-off Analysis by Stage',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const stage = dropoffAnalysis.find((d: any) => d.stage_name === params[0].name);
        return `${params[0].name}<br/>Users at Stage: ${stage?.users_at_stage || 0}<br/>Drop-off: ${stage?.dropoff_count || 0} (${stage?.dropoff_rate || 0}%)`;
      },
    },
    xAxis: {
      type: 'category',
      data: dropoffAnalysis.map((d: any) => d.stage_name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Users',
        position: 'left',
      },
      {
        type: 'value',
        name: 'Drop-off %',
        position: 'right',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
        },
      },
    ],
    series: [
      {
        name: 'Users at Stage',
        data: dropoffAnalysis.map((d: any) => d.users_at_stage || 0),
        type: 'bar',
        itemStyle: {
          color: '#3b82f6',
        },
      },
      {
        name: 'Drop-off Rate',
        data: dropoffAnalysis.map((d: any) => d.dropoff_rate || 0),
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#ef4444',
        },
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '10%',
      bottom: '20%',
      containLabel: true,
    },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Adoption Analytics</h1>
          <p className="text-gray-600">Track user progression through feature adoption paths</p>
        </div>
        <div className="relative">
          <select
            value={selectedFunnel}
            onChange={(e) => setSelectedFunnel(e.target.value)}
            className="block w-48 px-4 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            {(funnels || []).map((funnel: string) => (
              <option key={funnel} value={funnel}>
                {funnel.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fully Converted</p>
              <p className="text-2xl font-bold text-gray-900">{summary.fully_converted_users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Time to Adoption</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.avg_hours_to_full_adoption
                  ? `${Math.round(summary.avg_hours_to_full_adoption)}h`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Biggest Drop-off</p>
              <p className="text-lg font-bold text-gray-900 truncate" title={summary.biggest_dropoff_stage || 'N/A'}>
                {summary.biggest_dropoff_stage
                  ? `${summary.biggest_dropoff_rate}%`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-400 truncate" title={summary.biggest_dropoff_stage}>
                {summary.biggest_dropoff_stage || ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Conversion Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall Conversion Rate</h3>
          <span className="text-3xl font-bold text-green-600">{summary.overall_conversion_rate || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(summary.overall_conversion_rate || 0, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {summary.fully_converted_users || 0} out of {summary.total_users || 0} users completed all milestones
        </p>
      </div>

      {/* Funnel Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <ReactECharts option={funnelChartOption} style={{ height: '400px' }} />
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={conversionBarOption} style={{ height: '300px' }} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReactECharts option={timeChartOption} style={{ height: '300px' }} />
        </div>
      </div>

      {/* Drop-off Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <ReactECharts option={dropoffChartOption} style={{ height: '350px' }} />
      </div>

      {/* Detailed Stage Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Stage Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users Reached
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage Conversion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drop-off
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversionRates.map((stage: any, index: number) => {
                const dropoff = dropoffAnalysis.find((d: any) => d.stage_name === stage.stage_name);
                const time = timeToMilestone.find((t: any) => t.stage_name === stage.stage_name);
                return (
                  <tr key={stage.milestone_type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{stage.stage_order}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{stage.stage_name}</div>
                          <div className="text-xs text-gray-500">{stage.milestone_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stage.users_reached || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stage.conversion_rate_percent >= 50
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {stage.conversion_rate_percent || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stage.stage_conversion_rate >= 80
                          ? 'bg-green-100 text-green-800'
                          : stage.stage_conversion_rate >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {stage.stage_conversion_rate || 100}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dropoff?.dropoff_count || 0} ({dropoff?.dropoff_rate || 0}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {time?.avg_hours_to_complete
                        ? `${Math.round(time.avg_hours_to_complete)}h`
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/adoption')({
  component: AdoptionAnalyticsPage,
});

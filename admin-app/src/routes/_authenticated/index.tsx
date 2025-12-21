import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
} from 'lucide-react';

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-sm mt-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% from last period
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: () => adminApi.getSaasMetrics(),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
          <p className="text-red-700">Failed to load metrics. Please try again.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your SaaS platform</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Organizations"
          value={metrics?.totalOrganizations || 0}
          subtitle={`${metrics?.newOrganizations7d || 0} new this week`}
          icon={Building2}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.totalUsers || 0}
          subtitle={`${metrics?.activeOrganizations7d || 0} active orgs (7d)`}
          icon={Users}
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(metrics?.totalMrr || 0)}
          subtitle={`ARR: ${formatCurrency(metrics?.totalArr || 0)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="ARPU"
          value={formatCurrency(metrics?.arpu || 0)}
          subtitle="Average revenue per user"
          icon={TrendingUp}
        />
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Subscription Breakdown
          </h2>
          {metrics?.planBreakdown?.length ? (
            <div className="space-y-4">
              {metrics.planBreakdown.map((plan: any) => (
                <div
                  key={plan.planType}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {plan.planType || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {plan.count} organization{plan.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(plan.mrr)}/mo
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No subscription data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Stats
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">New Orgs (30d)</span>
              <span className="font-semibold">{metrics?.newOrganizations30d || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Active Orgs (30d)</span>
              <span className="font-semibold">{metrics?.activeOrganizations30d || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Churn Rate</span>
              <span className="font-semibold">{(metrics?.churnRate || 0).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Activation Rate</span>
              <span className="font-semibold">{(metrics?.activationRate || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Target,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import {
  useParcelPerformanceSummary,
  usePerformanceAlerts,
  useHarvestForecasts,
} from '@/hooks/useProductionIntelligence';
import { useNavigate } from '@tanstack/react-router';
import { formatCurrency } from '@/lib/taxCalculations';
import { YieldHistoryForm } from './YieldHistoryForm';
import { BenchmarkForm } from './BenchmarkForm';
import { HarvestForecastForm } from './HarvestForecastForm';

export const ProductionDashboard: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
    toDate: new Date().toISOString().split('T')[0],
  });

  // Form dialogs state
  const [isYieldFormOpen, setIsYieldFormOpen] = useState(false);
  const [isBenchmarkFormOpen, setIsBenchmarkFormOpen] = useState(false);
  const [isForecastFormOpen, setIsForecastFormOpen] = useState(false);

  // Fetch data
  const { data: performanceSummary = [], isLoading: loadingPerformance } = useParcelPerformanceSummary({
    farmId: currentFarm?.id,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  const { data: alerts = [], isLoading: loadingAlerts } = usePerformanceAlerts({
    farmId: currentFarm?.id,
    status: 'active',
  });

  const { data: forecasts = [], isLoading: loadingForecasts } = useHarvestForecasts({
    farmId: currentFarm?.id,
    status: 'pending',
    fromDate: new Date().toISOString().split('T')[0],
  });

  // Calculate KPIs
  const totalRevenue = performanceSummary.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
  const totalCost = performanceSummary.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgProfitMargin = performanceSummary.length > 0
    ? performanceSummary.reduce((sum, p) => sum + (p.avg_profit_margin || 0), 0) / performanceSummary.length
    : 0;

  const underperformingParcels = performanceSummary.filter(
    p => p.avg_variance_percent < -20 || p.performance_rating === 'poor' || p.performance_rating === 'below_average'
  );

  const topPerformingParcels = performanceSummary
    .filter(p => p.performance_rating === 'excellent' || p.performance_rating === 'good')
    .slice(0, 5);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const upcomingHarvests = forecasts.slice(0, 5);

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'good':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'average':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'below_average':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getVarianceIcon = (variance: number) => {
    if (variance >= 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loadingPerformance || loadingAlerts || loadingForecasts) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading production intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons and Date Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setIsYieldFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Record Yield
          </Button>
          <Button onClick={() => setIsForecastFormOpen(true)} variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Create Forecast
          </Button>
          <Button onClick={() => setIsBenchmarkFormOpen(true)} variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Set Benchmark
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Date range:</span>
          <input
            type="date"
            value={dateRange.fromDate}
            onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
          />
          <span className="text-gray-600 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.toDate}
            onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue, currentOrganization?.currency || 'MAD')}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              From {performanceSummary.reduce((sum, p) => sum + p.total_harvests, 0)} harvests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalProfit, currentOrganization?.currency || 'MAD')}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {avgProfitMargin.toFixed(1)}% avg margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Critical Alerts
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {criticalAlerts.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {underperformingParcels.length} underperforming parcels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Upcoming Harvests
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {upcomingHarvests.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Next 30 days forecast
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance Benchmarks</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="forecasts">Harvest Forecasts</TabsTrigger>
        </TabsList>

        {/* Performance Benchmarks Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Underperforming Parcels Alert */}
          {underperformingParcels.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <CardTitle>Underperforming Parcels Require Attention</CardTitle>
                  </div>
                  <Badge variant="destructive">{underperformingParcels.length} parcels</Badge>
                </div>
                <CardDescription>
                  These parcels are significantly below target yields and may need intervention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {underperformingParcels.map((parcel) => (
                    <div
                      key={parcel.parcel_id}
                      className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {parcel.parcel_name}
                          </h4>
                          <Badge className={getPerformanceColor(parcel.performance_rating)}>
                            {parcel.performance_rating}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {parcel.farm_name} • {parcel.crop_type}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-red-600">
                            {getVarianceIcon(parcel.avg_variance_percent)}
                            {parcel.avg_variance_percent.toFixed(1)}% vs target
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Avg: {parcel.avg_yield_per_hectare.toFixed(2)} vs Target: {parcel.avg_target_yield.toFixed(2)} kg/ha
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate({ to: '/accounting-invoices', search: { parcel_id: parcel.parcel_id } })}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Invoices
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate({ to: '/parcels' })}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performing Parcels */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Performing Parcels</CardTitle>
                  <CardDescription>Parcels exceeding target yields</CardDescription>
                </div>
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformingParcels.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No performance data available for the selected period
                  </p>
                ) : (
                  topPerformingParcels.map((parcel) => (
                    <div
                      key={parcel.parcel_id}
                      className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {parcel.parcel_name}
                          </h4>
                          <Badge className={getPerformanceColor(parcel.performance_rating)}>
                            {parcel.performance_rating}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {parcel.farm_name} • {parcel.crop_type}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-green-600 font-semibold">
                            {getVarianceIcon(parcel.avg_variance_percent)}
                            +{parcel.avg_variance_percent.toFixed(1)}% vs target
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Profit: {formatCurrency(parcel.total_profit, currentOrganization?.currency || 'MAD')}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Margin: {parcel.avg_profit_margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Parcels Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Parcels Performance</CardTitle>
              <CardDescription>Comprehensive yield and financial performance by parcel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b dark:border-gray-700">
                    <tr className="text-left">
                      <th className="pb-3 font-semibold">Parcel</th>
                      <th className="pb-3 font-semibold">Crop</th>
                      <th className="pb-3 font-semibold text-right">Avg Yield</th>
                      <th className="pb-3 font-semibold text-right">Target</th>
                      <th className="pb-3 font-semibold text-right">Variance</th>
                      <th className="pb-3 font-semibold text-center">Rating</th>
                      <th className="pb-3 font-semibold text-right">Revenue</th>
                      <th className="pb-3 font-semibold text-right">Profit</th>
                      <th className="pb-3 font-semibold text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceSummary.map((parcel) => (
                      <tr key={parcel.parcel_id} className="border-b dark:border-gray-800">
                        <td className="py-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {parcel.parcel_name}
                            </div>
                            <div className="text-xs text-gray-500">{parcel.farm_name}</div>
                          </div>
                        </td>
                        <td className="py-3">{parcel.crop_type}</td>
                        <td className="py-3 text-right">{parcel.avg_yield_per_hectare.toFixed(2)} kg/ha</td>
                        <td className="py-3 text-right">{parcel.avg_target_yield.toFixed(2)} kg/ha</td>
                        <td className="py-3 text-right">
                          <span className={parcel.avg_variance_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {parcel.avg_variance_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <Badge className={getPerformanceColor(parcel.performance_rating)}>
                            {parcel.performance_rating}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          {formatCurrency(parcel.total_revenue, currentOrganization?.currency || 'MAD')}
                        </td>
                        <td className="py-3 text-right">
                          {formatCurrency(parcel.total_profit, currentOrganization?.currency || 'MAD')}
                        </td>
                        <td className="py-3 text-right">{parcel.avg_profit_margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'warning' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <CardTitle>{alert.title}</CardTitle>
                    </div>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{alert.message}</p>
                  {alert.metric_name && (
                    <div className="flex items-center gap-4 text-sm mb-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        Actual: {alert.actual_value?.toFixed(2)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Target: {alert.target_value?.toFixed(2)}
                      </span>
                      <span className={`font-semibold ${
                        (alert.variance_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Variance: {alert.variance_percent?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Acknowledge
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {alert.parcel_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate({ to: '/accounting-invoices', search: { parcel_id: alert.parcel_id } })}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Reconcile Revenue
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          {upcomingHarvests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No upcoming harvest forecasts</p>
              </CardContent>
            </Card>
          ) : (
            upcomingHarvests.map((forecast) => (
              <Card key={forecast.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{forecast.crop_type}</CardTitle>
                      <CardDescription>
                        Forecast window: {new Date(forecast.forecast_harvest_date_start).toLocaleDateString()} - {new Date(forecast.forecast_harvest_date_end).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge>{forecast.confidence_level} confidence</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Predicted Yield</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {forecast.predicted_yield_quantity.toFixed(2)} {forecast.unit_of_measure}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Per Hectare</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {forecast.predicted_yield_per_hectare?.toFixed(2)} kg/ha
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Est. Revenue</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(forecast.estimated_revenue || 0, currentOrganization?.currency || 'MAD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Est. Profit</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(forecast.estimated_profit || 0, currentOrganization?.currency || 'MAD')}
                      </p>
                    </div>
                  </div>
                  {forecast.notes && (
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{forecast.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Data Entry Forms */}
      <YieldHistoryForm
        isOpen={isYieldFormOpen}
        onClose={() => setIsYieldFormOpen(false)}
        onSuccess={() => {
          // Refetch data after successful creation
          setIsYieldFormOpen(false);
        }}
      />

      <BenchmarkForm
        isOpen={isBenchmarkFormOpen}
        onClose={() => setIsBenchmarkFormOpen(false)}
        onSuccess={() => {
          setIsBenchmarkFormOpen(false);
        }}
      />

      <HarvestForecastForm
        isOpen={isForecastFormOpen}
        onClose={() => setIsForecastFormOpen(false)}
        onSuccess={() => {
          setIsForecastFormOpen(false);
        }}
      />
    </div>
  );
};

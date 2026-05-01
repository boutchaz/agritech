import React, { useState, lazy, Suspense } from 'react';
import { useStockMovements } from '@/hooks/useStockEntries';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Calendar,
  Download,
  Loader2,
  DollarSign,
} from 'lucide-react';
import type { StockMovementFilters } from '@/types/stock-entries';
import { MOVEMENT_TYPE_COLORS } from '@/types/stock-entries';
import { Badge } from '@/components/ui/badge';
import { useFarmStockLevels } from '@/hooks/useFarmStockLevels';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { formatQuantity } from '@/utils/units';
import { isRTLLocale } from '@/lib/is-rtl-locale';

// Lazy load chart components
const LineChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);
const PieChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PieChart }))
);
const Line = lazy(() => import('recharts').then((mod) => ({ default: mod.Line })));
const Pie = lazy(() => import('recharts').then((mod) => ({ default: mod.Pie })));
const Cell = lazy(() => import('recharts').then((mod) => ({ default: mod.Cell })));
const XAxis = lazy(() => import('recharts').then((mod) => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then((mod) => ({ default: mod.YAxis })));
const CartesianGrid = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.CartesianGrid }))
);
const Tooltip = lazy(() => import('recharts').then((mod) => ({ default: mod.Tooltip })));
const Legend = lazy(() => import('recharts').then((mod) => ({ default: mod.Legend })));
const ResponsiveContainer = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ResponsiveContainer }))
);

export default function StockReportsDashboard() {
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const { t, i18n } = useTranslation('stock');
  const isRTL = isRTLLocale(i18n.language);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [filters, setFilters] = useState<StockMovementFilters>({});

  const { data: movements = [], isLoading } = useStockMovements(filters);
  const { data: lowStockItems = [], isLoading: isLoadingLowStock } = useFarmStockLevels({
    low_stock_only: true,
  });

  // Calculate date filter
  const getDateFilter = () => {
    if (dateRange === 'all') return {};

    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const from_date = new Date();
    from_date.setDate(from_date.getDate() - days);

    return { from_date: from_date.toISOString().split('T')[0] };
  };

  // Apply date filter
  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, ...getDateFilter() }));
  }, [dateRange]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalIn = movements
      .filter((m) => m.movement_type === 'IN')
      .reduce((sum, m) => sum + m.quantity, 0);

    const totalOut = movements
      .filter((m) => m.movement_type === 'OUT')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    const totalValue = movements.reduce((sum, m) => sum + (m.total_cost || 0), 0);

    const uniqueItems = new Set(movements.map((m) => m.item_id)).size;

    return { totalIn, totalOut, totalValue, uniqueItems, netMovement: totalIn - totalOut };
  }, [movements]);

  // Group movements by date for chart
  const movementsByDate = React.useMemo(() => {
    const grouped: Record<string, { date: string; in: number; out: number }> = {};

    movements.forEach((m) => {
      const date = new Date(m.movement_date).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = { date, in: 0, out: 0 };
      }

      if (m.movement_type === 'IN') {
        grouped[date].in += m.quantity;
      } else if (m.movement_type === 'OUT') {
        grouped[date].out += Math.abs(m.quantity);
      }
    });

    return Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [movements]);

  // Group by movement type for pie chart
  const movementsByType = React.useMemo(() => {
    const grouped = movements.reduce((acc, m) => {
      const type = m.movement_type;
      if (!acc[type]) {
        acc[type] = { name: type, value: 0, count: 0 };
      }
      acc[type].value += Math.abs(m.quantity);
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number }>);

    return Object.values(grouped);
  }, [movements]);

  const COLORS = {
    IN: '#10b981',
    OUT: '#ef4444',
    TRANSFER: '#3b82f6',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ms-3 text-gray-600">{t('reports.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reports.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(val: string) => setDateRange(val)}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('reports.dateRanges.7days')}</SelectItem>
              <SelectItem value="30d">{t('reports.dateRanges.30days')}</SelectItem>
              <SelectItem value="90d">{t('reports.dateRanges.90days')}</SelectItem>
              <SelectItem value="all">{t('reports.dateRanges.all')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 me-2" />
            {t('reports.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('reports.cards.totalInward')}</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIn.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">{t('reports.cards.unitsReceived')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('reports.cards.totalOutward')}</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOut.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">{t('reports.cards.unitsIssued')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('reports.cards.netMovement')}</CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.netMovement.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">{t('reports.cards.netChange')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('reports.cards.totalValue')}</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentOrganization?.currency || DEFAULT_CURRENCY} {stats.totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('reports.cards.inventoryValue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">{t('reports.tabs.movements')}</TabsTrigger>
          <TabsTrigger value="distribution">{t('reports.tabs.distribution')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('reports.tabs.alerts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.movementTrends')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-80">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={movementsByDate} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" reversed={isRTL} />
                    <YAxis orientation={isRTL ? 'right' : 'left'} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="in"
                      stroke="#10b981"
                      name={t('reports.inward')}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="out"
                      stroke="#ef4444"
                      name={t('reports.outward')}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Suspense>
            </CardContent>
          </Card>

          {/* Recent Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.recentMovements')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movements.slice(0, 10).map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={MOVEMENT_TYPE_COLORS[movement.movement_type]}>
                        {movement.movement_type}
                      </Badge>
                      <div>
                        <p className="font-medium">{movement.item?.item_name || t('reports.unknownItem')}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(movement.movement_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="font-medium">
                        {movement.quantity > 0 ? '+' : ''}
                        {formatQuantity(movement.quantity, movement.unit, i18n.language)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('reports.balance')} {movement.balance_quantity.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.typeDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-80">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={movementsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.count}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {movementsByType.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  {t('reports.lowStockItems')}
                  {lowStockItems.length > 0 && (
                    <Badge variant="destructive" className="ms-2">
                      {lowStockItems.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLowStock ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {t('reports.noLowStock')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 5).map((item) => (
                      <div
                        key={item.item_id}
                        className="p-3 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{item.item_name}</h4>
                            <p className="text-xs text-gray-500">{item.item_code}</p>
                          </div>
                          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{t('reports.currentStock')}</span>
                          <span className="font-medium text-orange-700">
                            {formatQuantity(item.total_quantity, item.default_unit, i18n.language)}
                          </span>
                        </div>
                        {item.minimum_stock_level && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-600">{t('reports.minimumLevel')}</span>
                            <span className="font-medium">{formatQuantity(item.minimum_stock_level, item.default_unit, i18n.language)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600">{t('reports.totalValue')}</span>
                          <span className="font-medium">{formatCurrency(item.total_value)}</span>
                        </div>
                      </div>
                    ))}
                    {lowStockItems.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        {t('reports.moreItems', { count: lowStockItems.length - 5 })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  {t('reports.expiringSoon')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">{t('reports.noExpiring')}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

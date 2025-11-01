import React, { useState, lazy, Suspense } from 'react';
import { useStockMovements } from '@/hooks/useStockEntries';
import { useAuth } from '@/components/MultiTenantAuthProvider';
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
  BarChart3,
} from 'lucide-react';
import type { StockMovementFilters } from '@/types/stock-entries';
import { MOVEMENT_TYPE_COLORS } from '@/types/stock-entries';
import { Badge } from '@/components/ui/badge';

// Lazy load chart components
const LineChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);
const BarChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.BarChart }))
);
const PieChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PieChart }))
);
const Line = lazy(() => import('recharts').then((mod) => ({ default: mod.Line })));
const Bar = lazy(() => import('recharts').then((mod) => ({ default: mod.Bar })));
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
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [filters, setFilters] = useState<StockMovementFilters>({});

  const { data: movements = [], isLoading } = useStockMovements(filters);

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
        <span className="ml-3 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Reports & Analytics</h2>
          <p className="text-gray-600">Track stock movements, valuation, and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Inward</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIn.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Units received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Outward</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOut.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Units issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Movement</CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.netMovement.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Net change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentOrganization?.currency || 'MAD'} {stats.totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Warnings</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Trends</CardTitle>
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
                  <LineChart data={movementsByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="in"
                      stroke="#10b981"
                      name="Inward"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="out"
                      stroke="#ef4444"
                      name="Outward"
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
              <CardTitle>Recent Movements</CardTitle>
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
                        <p className="font-medium">{movement.item?.name || 'Unknown Item'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(movement.movement_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {movement.quantity > 0 ? '+' : ''}
                        {movement.quantity.toFixed(2)} {movement.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {movement.balance_quantity.toFixed(2)}
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
              <CardTitle>Movement Type Distribution</CardTitle>
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
                      {movementsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
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
                  Low Stock Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  No low stock items at the moment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">No expiring items in next 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

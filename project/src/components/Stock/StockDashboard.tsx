import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionLoader } from '@/components/ui/loader';
import { useStockDashboard } from '@/hooks/useStockDashboard';
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function DashboardCard({ title, value, icon, color, onClick }: DashboardCardProps) {
  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md dark:border-gray-700',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className={cn('rounded-full p-2', color)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatMAD(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StockDashboard() {
  const { t } = useTranslation('stock');
  const navigate = useNavigate();
  const { data, isLoading, error } = useStockDashboard();

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed dark:border-gray-700">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          {t('stockDashboard.error', 'Failed to load dashboard data')}
        </p>
      </div>
    );
  }

  const dashboard = data || {
    totalStockValue: 0,
    lowStockAlertsCount: 0,
    pendingEntriesCount: 0,
    recentMovementsCount: 0,
    warehouseCount: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('stockDashboard.title', 'Stock Dashboard')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('stockDashboard.subtitle', 'Overview of your inventory status')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={t('stockDashboard.totalStockValue', 'Total Stock Value')}
          value={formatMAD(dashboard.totalStockValue)}
          icon={<Package className="w-5 h-5 text-green-600 dark:text-green-400" />}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <DashboardCard
          title={t('stockDashboard.lowStockAlerts', 'Low Stock Alerts')}
          value={dashboard.lowStockAlertsCount}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          color="bg-orange-100 dark:bg-orange-900/30"
          onClick={() => navigate({ to: '/stock/reports' })}
        />
        <DashboardCard
          title={t('stockDashboard.pendingEntries', 'Pending Entries')}
          value={dashboard.pendingEntriesCount}
          icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          color="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => navigate({ to: '/stock/approvals' })}
        />
        <DashboardCard
          title={t('stockDashboard.recentMovements', 'Recent Movements')}
          value={dashboard.recentMovementsCount}
          icon={<ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          color="bg-purple-100 dark:bg-purple-900/30"
        />
        <DashboardCard
          title={t('stockDashboard.warehouses', 'Warehouses')}
          value={dashboard.warehouseCount}
          icon={<Warehouse className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          color="bg-indigo-100 dark:bg-indigo-900/30"
          onClick={() => navigate({ to: '/stock/warehouses' })}
        />
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Download, Eye, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FilterBar,
  ResponsiveList,
  type StatusFilterOption,
} from '@/components/ui/data-table';
import type { OrderStatus } from '@/lib/api/lab-services';

interface LabOrderListItem {
  id: string;
  status: OrderStatus;
  order_number?: string | null;
  order_date?: string | null;
  results_document_url?: string | null;
  service_type?: { name?: string | null };
  provider?: { name?: string | null };
  farm?: { id?: string; name?: string | null } | null;
  parcel?: { id?: string; name?: string | null } | null;
  created_at?: string;
}

interface LabOrdersListProps {
  orders: LabOrderListItem[];
  isLoading: boolean;
  searchValue?: string;
  statusFilter?: OrderStatus | 'all';
  onSearchChange?: (value: string) => void;
  onStatusFilter?: (status: OrderStatus | 'all') => void;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { label: 'En attente', variant: 'outline' },
  sample_collected: { label: 'Échantillon collecté', variant: 'secondary' },
  sent_to_lab: { label: 'Envoyé au labo', variant: 'default' },
  in_progress: { label: "En cours d'analyse", variant: 'default' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'outline' },
};

export function LabOrdersList({
  orders,
  isLoading,
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilter,
}: LabOrdersListProps) {
  const { t } = useTranslation();
  const [internalSearch, setInternalSearch] = useState('');
  const [internalStatus, setInternalStatus] = useState<OrderStatus | 'all'>('all');

  const currentSearch = searchValue ?? internalSearch;
  const currentStatus = statusFilter ?? internalStatus;

  const handleSearchChange = (value: string) => {
    onSearchChange?.(value);

    if (searchValue === undefined) {
      setInternalSearch(value);
    }
  };

  const handleStatusChange = (status: string) => {
    const nextStatus = status as OrderStatus | 'all';

    onStatusFilter?.(nextStatus);

    if (statusFilter === undefined) {
      setInternalStatus(nextStatus);
    }
  };

  const visibleOrders = useMemo(() => {
    const normalizedSearch = currentSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.order_number?.toLowerCase().includes(normalizedSearch) ||
        order.service_type?.name?.toLowerCase().includes(normalizedSearch) ||
        order.provider?.name?.toLowerCase().includes(normalizedSearch) ||
        order.farm?.name?.toLowerCase().includes(normalizedSearch) ||
        order.parcel?.name?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = currentStatus === 'all' || order.status === currentStatus;

      return matchesSearch && matchesStatus;
    });
  }, [currentSearch, currentStatus, orders]);

  const statusFilters: StatusFilterOption[] = [
    { value: 'all', label: t('common.filters.all', 'Tous') },
    { value: 'pending', label: statusConfig.pending.label },
    { value: 'sample_collected', label: statusConfig.sample_collected.label },
    { value: 'sent_to_lab', label: statusConfig.sent_to_lab.label },
    { value: 'in_progress', label: statusConfig.in_progress.label },
    { value: 'completed', label: statusConfig.completed.label },
    { value: 'cancelled', label: statusConfig.cancelled.label },
  ];

  const formatOrderDate = (date?: string | null) => (
    date ? new Date(date).toLocaleDateString() : '-'
  );

  const renderActions = (order: LabOrderListItem) => (
    <div className="flex items-center gap-2">
      {order.status === 'completed' && order.results_document_url && (
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Rapport
        </Button>
      )}
      <Button variant="ghost" size="sm" className="gap-2">
        <Eye className="h-4 w-4" />
        Détails
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={currentSearch}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t(
          'labServices.orders.searchPlaceholder',
          'Rechercher par commande, service, laboratoire, ferme ou parcelle...',
        )}
        statusFilters={statusFilters}
        activeStatus={currentStatus}
        onStatusChange={handleStatusChange}
      />

      <ResponsiveList
        items={visibleOrders}
        isLoading={isLoading}
        keyExtractor={(order) => order.id}
        emptyIcon={FlaskConical}
        emptyTitle={t('labServices.orders.emptyTitle', 'Aucune commande trouvée')}
        emptyMessage={t('labServices.orders.emptyMessage', 'Aucune commande pour le moment')}
        renderCard={(order) => (
          <Card className="transition-colors hover:border-green-500 dark:hover:border-green-600">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {order.service_type?.name ?? '-'}
                      </h3>
                      <Badge variant={statusConfig[order.status].variant}>
                        {statusConfig[order.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.provider?.name ?? '-'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {order.order_number ?? '-'}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>{t('labServices.orders.fields.date', 'Date')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatOrderDate(order.order_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t('labServices.orders.fields.farm', 'Ferme')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {order.farm?.name ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t('labServices.orders.fields.parcel', 'Parcelle')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {order.parcel?.name ?? '-'}
                    </span>
                  </div>
                </div>

                {renderActions(order)}
              </div>
            </CardContent>
          </Card>
        )}
        renderTableHeader={
          <tr>
            <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('labServices.orders.table.orderNumber', 'Commande')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('labServices.orders.table.serviceType', 'Service')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('labServices.orders.table.status', 'Statut')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('labServices.orders.table.date', 'Date')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('labServices.orders.table.actions', 'Actions')}
            </th>
          </tr>
        }
        renderTable={(order) => (
          <>
            <td className="px-4 xl:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
              {order.order_number ?? '-'}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {order.service_type?.name ?? '-'}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              <Badge variant={statusConfig[order.status].variant}>
                {statusConfig[order.status].label}
              </Badge>
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {formatOrderDate(order.order_date)}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm">
              <div className="flex justify-end">{renderActions(order)}</div>
            </td>
          </>
        )}
      />
    </div>
  );
}

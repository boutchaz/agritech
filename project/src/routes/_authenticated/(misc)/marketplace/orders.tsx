import { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Package,
  CheckCircle,
  Truck,
  Home,
  Clock,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar, ResponsiveList, ListPageLayout, type StatusFilterOption } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';
import type { LucideIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';


export const Route = createFileRoute(
  '/_authenticated/(misc)/marketplace/orders',
)({
  component: SellerOrdersPage,
});

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface OrderBuyer {
  name?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  buyer?: OrderBuyer;
  items?: OrderItem[];
}

const getStatusConfig = (t: TFunction) => (status: string): { label: string; color: string; icon: LucideIcon } => {
  const configs: Record<
    string,
    { label: string; color: string; icon: LucideIcon }
  > = {
    pending: { label: t('marketplace.orders.status.pending', 'Pending'), color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: t('marketplace.orders.status.confirmed', 'Confirmed'), color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    shipped: { label: t('marketplace.orders.status.shipped', 'Shipped'), color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: t('marketplace.orders.status.delivered', 'Delivered'), color: 'bg-green-100 text-green-800', icon: Home },
    cancelled: { label: t('marketplace.orders.status.cancelled', 'Cancelled'), color: 'bg-red-100 text-red-800', icon: XCircle },
  };
  return configs[status] || configs.pending;
};

function SellerOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['seller-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ role: 'seller' });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      return apiClient.get<Order[]>(
        `/marketplace/orders?${params.toString()}`,
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      return apiClient.patch(`/marketplace/orders/${orderId}/status`, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const search = searchQuery.toLowerCase();
    return orders.filter((order) =>
      order.id?.toLowerCase().includes(search) ||
      order.buyer?.name?.toLowerCase().includes(search) ||
      order.items?.some((item) =>
        item.title?.toLowerCase().includes(search),
      )
    );
  }, [orders, searchQuery]);

  const statusFilters: StatusFilterOption[] = [
    { value: 'all', label: t('marketplace.orders.allStatuses', 'Tous') },
    { value: 'pending', label: t('marketplace.orders.pending', 'En attente') },
    { value: 'confirmed', label: t('marketplace.orders.confirmed', 'Confirmées') },
    { value: 'shipped', label: t('marketplace.orders.shipped', 'Expédiées') },
    { value: 'delivered', label: t('marketplace.orders.delivered', 'Livrées') },
    { value: 'cancelled', label: t('marketplace.orders.cancelled', 'Annulées') },
  ];

  const getAvailableActions = (order: Order) => {
    switch (order.status) {
      case 'pending':
        return [
          { label: t('marketplace.orders.confirm', 'Confirmer'), status: 'confirmed', variant: 'default' as const },
          { label: t('marketplace.orders.cancel', 'Annuler'), status: 'cancelled', variant: 'destructive' as const },
        ];
      case 'confirmed':
        return [{ label: t('marketplace.orders.markShipped', 'Marquer expédiée'), status: 'shipped', variant: 'default' as const }];
      case 'shipped':
        return [{ label: t('marketplace.orders.markDelivered', 'Marquer livrée'), status: 'delivered', variant: 'default' as const }];
      default:
        return [];
    }
  };

  const renderOrderCard = (order: Order) => {
    const status = getStatusConfig(t)(order.status);
    const StatusIcon = status.icon;
    const actions = getAvailableActions(order);

    return (
      <div className="p-6 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">#{order.id?.slice(0, 8)}</p>
            <p className="text-lg font-semibold">{order.total?.toLocaleString('fr-MA')} MAD</p>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">{t('marketplace.orders.buyer', 'Client')}</p>
            <p className="font-medium">{order.buyer?.name || t('marketplace.orders.anonymous', 'Client anonyme')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('marketplace.orders.date', 'Date')}</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('marketplace.orders.items', 'Articles')}</p>
            <p className="font-medium">{order.items?.length || 0} {t('marketplace.orders.products', 'produit(s)')}</p>
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="border-t pt-4 mb-4">
            <p className="text-sm font-medium mb-2">{t('marketplace.orders.orderedItems', 'Articles commandés:')}</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={`${item.title}-${item.price}-${item.quantity}`} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.title}</span>
                  <span className="text-gray-600">{(item.price * item.quantity).toLocaleString('fr-MA')} MAD</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="flex gap-2 justify-end border-t pt-4">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: action.status })}
                disabled={updateStatusMutation.isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOrderTable = (order: Order) => {
    const status = getStatusConfig(t)(order.status);
    const StatusIcon = status.icon;
    const actions = getAvailableActions(order);

    return (
      <>
        <TableCell className="font-medium">#{order.id?.slice(0, 8)}</TableCell>
        <TableCell>{order.buyer?.name || '-'}</TableCell>
        <TableCell>{new Date(order.created_at).toLocaleDateString('fr-FR')}</TableCell>
        <TableCell>{order.total?.toLocaleString('fr-MA')} MAD</TableCell>
        <TableCell>{order.items?.length || 0}</TableCell>
        <TableCell>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1 justify-end">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: action.status })}
                disabled={updateStatusMutation.isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </TableCell>
      </>
    );
  };

  return (
    <ListPageLayout
      filters={
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('marketplace.orders.search', 'Rechercher une commande...')}
          statusFilters={statusFilters}
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
          onClear={() => { setSearchQuery(''); setStatusFilter('all'); }}
        />
      }
    >
      <ResponsiveList
        items={filteredOrders}
        isLoading={isLoading}
        keyExtractor={(order) => order.id}
        emptyIcon={Package}
        emptyMessage={t('marketplace.orders.empty', 'Aucune commande trouvée')}
        renderCard={renderOrderCard}
        renderTable={renderOrderTable}
        renderTableHeader={
          <>
            <TableHead>{t('marketplace.orders.order', 'Commande')}</TableHead>
            <TableHead>{t('marketplace.orders.buyer', 'Client')}</TableHead>
            <TableHead>{t('marketplace.orders.date', 'Date')}</TableHead>
            <TableHead>{t('marketplace.orders.total', 'Total')}</TableHead>
            <TableHead>{t('marketplace.orders.items', 'Articles')}</TableHead>
            <TableHead>{t('marketplace.orders.status', 'Statut')}</TableHead>
            <TableHead>{t('marketplace.orders.actions', 'Actions')}</TableHead>
          </>
        }
      />
    </ListPageLayout>
  );
}

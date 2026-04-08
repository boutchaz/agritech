import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import type { LucideIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { SectionLoader } from '@/components/ui/loader';


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

const statusConfig: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  pending: {
    label: 'En attente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirm\u00e9e',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
  },
  shipped: {
    label: 'Exp\u00e9di\u00e9e',
    color: 'bg-purple-100 text-purple-800',
    icon: Truck,
  },
  delivered: {
    label: 'Livr\u00e9e',
    color: 'bg-green-100 text-green-800',
    icon: Home,
  },
  cancelled: {
    label: 'Annul\u00e9e',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

function OrderCard({
  order,
  onUpdateStatus,
  isUpdating,
}: {
  order: Order;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const getAvailableActions = (): {
    label: string;
    status: string;
    variant: 'default' | 'destructive';
  }[] => {
    switch (order.status) {
      case 'pending':
        return [
          { label: 'Confirmer', status: 'confirmed', variant: 'default' },
          { label: 'Annuler', status: 'cancelled', variant: 'destructive' },
        ];
      case 'confirmed':
        return [
          {
            label: 'Marquer exp\u00e9di\u00e9e',
            status: 'shipped',
            variant: 'default',
          },
        ];
      case 'shipped':
        return [
          {
            label: 'Marquer livr\u00e9e',
            status: 'delivered',
            variant: 'default',
          },
        ];
      default:
        return [];
    }
  };

  const actions = getAvailableActions();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Commande #{order.id?.slice(0, 8)}
            </p>
            <p className="text-lg font-semibold">
              {order.total?.toLocaleString('fr-MA')} MAD
            </p>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Client</p>
            <p className="font-medium">
              {order.buyer?.name || 'Client anonyme'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">
              {new Date(order.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Articles</p>
            <p className="font-medium">
              {order.items?.length || 0} produit(s)
            </p>
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="border-t pt-4 mb-4">
            <p className="text-sm font-medium mb-2">
              Articles command\u00e9s:
            </p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={`${item.title}-${item.price}-${item.quantity}`} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.title}
                  </span>
                  <span className="text-gray-600">
                    {(item.price * item.quantity).toLocaleString('fr-MA')} MAD
                  </span>
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
                onClick={() => onUpdateStatus(action.status)}
                disabled={isUpdating}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SellerOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        order.id?.toLowerCase().includes(search) ||
        order.buyer?.name?.toLowerCase().includes(search) ||
        order.items?.some((item) =>
          item.title?.toLowerCase().includes(search),
        )
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('marketplace.orders.title', 'Gestion des commandes')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t(
            'marketplace.orders.subtitle',
            'G\u00e9rez les commandes re\u00e7ues de vos clients',
          )}
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t(
              'marketplace.orders.search',
              'Rechercher une commande...',
            )}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirm\u00e9es</SelectItem>
            <SelectItem value="shipped">Exp\u00e9di\u00e9es</SelectItem>
            <SelectItem value="delivered">Livr\u00e9es</SelectItem>
            <SelectItem value="cancelled">Annul\u00e9es</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {t('marketplace.orders.empty', 'Aucune commande trouv\u00e9e')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={(status) =>
                updateStatusMutation.mutate({ orderId: order.id, status })
              }
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

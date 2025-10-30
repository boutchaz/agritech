import { Eye, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LabOrdersListProps {
  orders: any[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; variant: any }> = {
  pending: { label: 'En attente', variant: 'outline' },
  sample_collected: { label: 'Échantillon collecté', variant: 'secondary' },
  sent_to_lab: { label: 'Envoyé au labo', variant: 'default' },
  in_progress: { label: 'En cours d\'analyse', variant: 'default' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'outline' },
};

export function LabOrdersList({ orders, isLoading }: LabOrdersListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Aucune commande pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="hover:border-green-500 dark:hover:border-green-600 transition-colors">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {order.service_type?.name}
                  </h3>
                  <Badge variant={statusConfig[order.status]?.variant}>
                    {statusConfig[order.status]?.label}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                  <p>Commande: {order.order_number}</p>
                  <p>Date: {new Date(order.order_date).toLocaleDateString()}</p>
                  {order.farm && <p>Ferme: {order.farm.name}</p>}
                  {order.parcel && <p>Parcelle: {order.parcel.name}</p>}
                </div>
              </div>
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_CURRENCY } from '../../utils/currencies';
import { quoteRequestsApi } from '../../lib/api/quote-requests';
import {
  Mail,
  Calendar,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  Loader2,
  MessageSquare,
  Building2,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

export function QuoteRequestsSent() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  // Fetch sent quote requests
  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['quote-requests', 'sent', selectedStatus, currentOrganization?.id],
    queryFn: () => quoteRequestsApi.getSent(selectedStatus, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
  });

  // Update quote mutation (for accepting/declining)
  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      quoteRequestsApi.update(id, data, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      toast.success('Quote request updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update quote request');
      console.error(error);
    },
  });

  const handleAccept = async (quoteId: string) => {
    showConfirm('Accepter ce devis?', () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'accepted' }),
      });
    }
  };

  const handleDecline = async (quoteId: string) => {
    showConfirm('Refuser ce devis?', () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'declined' }),
      });
    }
  };

  const handleCancel = async (quoteId: string) => {
    showConfirm('Annuler cette demande de devis?', () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'cancelled' }),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewed':
        return 'bg-blue-100 text-blue-800';
      case 'responded':
      case 'quoted':
        return 'bg-purple-100 text-purple-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      case 'responded':
      case 'quoted':
        return <Send className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Mes Demandes de Devis
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Suivez vos demandes de devis envoyées aux vendeurs
        </p>
      </div>

      {/* Filters */}
      <Tabs value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">En Attente</TabsTrigger>
          <TabsTrigger value="quoted">Devis Reçus</TabsTrigger>
          <TabsTrigger value="accepted">Acceptées</TabsTrigger>
          <TabsTrigger value="declined">Refusées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quote Requests List */}
      <div className="space-y-4">
        {quoteRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune demande de devis</p>
            </CardContent>
          </Card>
        ) : (
          quoteRequests.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {quote.product_title}
                      </h3>
                      <Badge className={`${getStatusColor(quote.status)} flex items-center gap-1`}>
                        {getStatusIcon(quote.status)}
                        {quote.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Seller Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Vendeur</h4>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {quote.seller?.logo_url ? (
                          <img
                            src={quote.seller.logo_url}
                            alt={quote.seller.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{quote.seller?.name}</p>
                        {quote.seller?.city && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {quote.seller.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Détails</h4>
                    <div className="space-y-1 text-sm">
                      {quote.requested_quantity && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Package className="h-4 w-4" />
                          <span>{quote.requested_quantity} {quote.unit_of_measure || 'unités'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Demandé le {formatDate(quote.created_at)}</span>
                      </div>
                      {quote.viewed_at && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Eye className="h-4 w-4" />
                          <span>Vu le {formatDate(quote.viewed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Your Message */}
                {quote.message && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Votre message:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{quote.message}"
                    </p>
                  </div>
                )}

                {/* Quoted Price */}
                {quote.quoted_price && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-700 dark:text-green-400" />
                        <span className="font-semibold text-lg text-green-700 dark:text-green-400">
                          {quote.quoted_price.toLocaleString()} {quote.quoted_currency || DEFAULT_CURRENCY}
                        </span>
                        {quote.unit_of_measure && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">/ {quote.unit_of_measure}</span>
                        )}
                      </div>
                      {quote.quote_valid_until && (
                        <span className="text-xs text-gray-500">
                          Valide jusqu'au {new Date(quote.quote_valid_until).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {quote.requested_quantity && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Total estimé: <strong>{(quote.quoted_price * quote.requested_quantity).toLocaleString()} {quote.quoted_currency || DEFAULT_CURRENCY}</strong>
                      </p>
                    )}
                    {quote.seller_response && (
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Réponse du vendeur:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {quote.seller_response}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {quote.status === 'quoted' && (
                    <>
                      <Button
                        onClick={() => handleAccept(quote.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepter le Devis
                      </Button>
                      <Button
                        onClick={() => handleDecline(quote.id)}
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}

                  {['pending', 'viewed'].includes(quote.status) && (
                    <Button
                      onClick={() => handleCancel(quote.id)}
                      variant="outline"
                      className="border-gray-400 text-gray-600 hover:bg-gray-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler la Demande
                    </Button>
                  )}

                  {quote.seller?.email && (
                    <Button variant="outline" asChild>
                      <a href={`mailto:${quote.seller.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Contacter le Vendeur
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
}

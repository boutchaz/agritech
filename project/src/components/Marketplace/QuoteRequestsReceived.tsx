import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_CURRENCY } from '../../utils/currencies';
import { quoteRequestsApi, QuoteRequest } from '../../lib/api/quote-requests';
import {
  Mail,
  Phone,
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
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { QuoteResponseDialog } from './QuoteResponseDialog';
import { toast } from 'sonner';

export function QuoteRequestsReceived() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  // Fetch received quote requests
  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['quote-requests', 'received', selectedStatus, currentOrganization?.id],
    queryFn: () => quoteRequestsApi.getReceived(selectedStatus, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['quote-requests', 'stats', currentOrganization?.id],
    queryFn: () => quoteRequestsApi.getStats(currentOrganization?.id),
    enabled: !!currentOrganization?.id,
  });

  // Update quote mutation
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

  const handleRespond = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    setShowResponseDialog(true);
  };

  const handleQuickAction = async (quoteId: string, status: 'accepted' | 'declined') => {
    await updateQuoteMutation.mutateAsync({
      id: quoteId,
      data: { status },
    });
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
          Demandes de Devis Reçues
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gérez les demandes de devis de vos clients
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Répondues</CardTitle>
              <Send className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.responded_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Acceptées</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted_requests}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Tabs value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">En Attente</TabsTrigger>
          <TabsTrigger value="viewed">Vues</TabsTrigger>
          <TabsTrigger value="quoted">Devis Envoyés</TabsTrigger>
          <TabsTrigger value="accepted">Acceptées</TabsTrigger>
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
                    {quote.product_description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {quote.product_description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Buyer Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Client</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{quote.buyer_contact_name || quote.requester?.name}</span>
                      </div>
                      {quote.buyer_contact_email && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${quote.buyer_contact_email}`} className="hover:text-green-600">
                            {quote.buyer_contact_email}
                          </a>
                        </div>
                      )}
                      {quote.buyer_contact_phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${quote.buyer_contact_phone}`} className="hover:text-green-600">
                            {quote.buyer_contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Détails de la demande</h4>
                    <div className="space-y-1 text-sm">
                      {quote.requested_quantity && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Package className="h-4 w-4" />
                          <span>{quote.requested_quantity} {quote.unit_of_measure || 'unités'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(quote.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {quote.message && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{quote.message}"
                    </p>
                  </div>
                )}

                {/* Quoted Price */}
                {quote.quoted_price && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-semibold text-lg">
                        {quote.quoted_price.toLocaleString()} {quote.quoted_currency || DEFAULT_CURRENCY}
                      </span>
                      {quote.unit_of_measure && <span className="text-sm">/ {quote.unit_of_measure}</span>}
                    </div>
                    {quote.seller_response && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {quote.seller_response}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {['pending', 'viewed'].includes(quote.status) && (
                    <Button variant="green"
                      onClick={() => handleRespond(quote)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer un Devis
                    </Button>
                  )}

                  {quote.status === 'quoted' && (
                    <>
                      <Button
                        onClick={() => handleQuickAction(quote.id, 'accepted')}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marquer Accepté
                      </Button>
                      <Button
                        onClick={() => handleQuickAction(quote.id, 'declined')}
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Marquer Refusé
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Response Dialog */}
      {selectedQuote && (
        <QuoteResponseDialog
          open={showResponseDialog}
          onOpenChange={setShowResponseDialog}
          quote={selectedQuote}
          onSubmit={async (data) => {
            await updateQuoteMutation.mutateAsync({
              id: selectedQuote.id,
              data,
            });
            setShowResponseDialog(false);
            setSelectedQuote(null);
          }}
        />
      )}
    </div>
  );
}

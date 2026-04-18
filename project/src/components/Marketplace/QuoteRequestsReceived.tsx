import {  useState, useMemo  } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
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
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { QuoteResponseDialog } from './QuoteResponseDialog';
import { toast } from 'sonner';
import { FilterBar, ResponsiveList, ListPageLayout, type StatusFilterOption } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';

export function QuoteRequestsReceived() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  const { t } = useTranslation();

  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['quote-requests', 'received', selectedStatus === 'all' ? undefined : selectedStatus, currentOrganization?.id],
    queryFn: () => quoteRequestsApi.getReceived(selectedStatus === 'all' ? undefined : selectedStatus, currentOrganization?.id),
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

  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return quoteRequests;
    const q = searchTerm.toLowerCase();
    return quoteRequests.filter(
      (quote) =>
        quote.product_title?.toLowerCase().includes(q) ||
        quote.buyer_contact_name?.toLowerCase().includes(q) ||
        quote.requester?.name?.toLowerCase().includes(q) ||
        quote.message?.toLowerCase().includes(q)
    );
  }, [quoteRequests, searchTerm]);

  const statusFilters: StatusFilterOption[] = [
    { value: 'all', label: t('quoteRequests.all', 'All') },
    { value: 'pending', label: t('quoteRequests.pending', 'Pending') },
    { value: 'viewed', label: t('quoteRequests.viewed', 'Viewed') },
    { value: 'quoted', label: t('quoteRequests.quoted', 'Quoted') },
    { value: 'accepted', label: t('quoteRequests.accepted', 'Accepted') },
  ];

  return (
    <>
    <ListPageLayout
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('quoteRequests.searchPlaceholder', 'Search by product or buyer...')}
          statusFilters={statusFilters}
          activeStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onClear={() => { setSearchTerm(''); setSelectedStatus('all'); }}
        />
      }
    >
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('quoteRequests.total', 'Total')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('quoteRequests.pending', 'En Attente')}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('quoteRequests.responded', 'Répondues')}</CardTitle>
              <Send className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.responded_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{t('quoteRequests.accepted', 'Acceptées')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted_requests}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <ResponsiveList
        items={filteredQuotes}
        isLoading={isLoading}
        keyExtractor={(quote) => quote.id}
        emptyIcon={MessageSquare}
        emptyMessage={t('quoteRequests.noRequests', 'Aucune demande de devis')}
        renderCard={(quote) => (
          <div className="p-6 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
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
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">{t('quoteRequests.buyer', 'Client')}</h4>
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

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">{t('quoteRequests.details', 'Détails')}</h4>
                <div className="space-y-1 text-sm">
                  {quote.requested_quantity && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Package className="h-4 w-4" />
                      <span>{quote.requested_quantity} {quote.unit_of_measure || t('quoteRequests.units', 'unités')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(quote.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {quote.message && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  &ldquo;{quote.message}&rdquo;
                </p>
              </div>
            )}

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

            <div className="flex gap-2">
              {['pending', 'viewed'].includes(quote.status) && (
                <Button variant="green" onClick={() => handleRespond(quote)}>
                  <Send className="h-4 w-4 mr-2" />
                  {t('quoteRequests.sendQuote', 'Envoyer un Devis')}
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
                    {t('quoteRequests.markAccepted', 'Marquer Accepté')}
                  </Button>
                  <Button
                    onClick={() => handleQuickAction(quote.id, 'declined')}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('quoteRequests.markDeclined', 'Marquer Refusé')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        renderTableHeader={
          <>
            <TableHead>{t('quoteRequests.product', 'Product')}</TableHead>
            <TableHead>{t('quoteRequests.buyer', 'Buyer')}</TableHead>
            <TableHead>{t('quoteRequests.quantity', 'Quantity')}</TableHead>
            <TableHead>{t('quoteRequests.date', 'Date')}</TableHead>
            <TableHead>{t('quoteRequests.status', 'Status')}</TableHead>
            <TableHead>{t('quoteRequests.price', 'Price')}</TableHead>
            <TableHead>{t('quoteRequests.actions', 'Actions')}</TableHead>
          </>
        }
        renderTable={(quote) => (
          <>
            <TableCell className="font-medium">{quote.product_title}</TableCell>
            <TableCell>{quote.buyer_contact_name || quote.requester?.name || '-'}</TableCell>
            <TableCell>
              {quote.requested_quantity ? `${quote.requested_quantity} ${quote.unit_of_measure || ''}` : '-'}
            </TableCell>
            <TableCell className="text-sm">{formatDate(quote.created_at)}</TableCell>
            <TableCell>
              <Badge className={`${getStatusColor(quote.status)} flex items-center gap-1`}>
                {getStatusIcon(quote.status)}
                {quote.status}
              </Badge>
            </TableCell>
            <TableCell>
              {quote.quoted_price ? (
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {quote.quoted_price.toLocaleString()} {quote.quoted_currency || DEFAULT_CURRENCY}
                </span>
              ) : '-'}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {['pending', 'viewed'].includes(quote.status) && (
                  <Button variant="green" size="sm" onClick={() => handleRespond(quote)}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {quote.status === 'quoted' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleQuickAction(quote.id, 'accepted')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickAction(quote.id, 'declined')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </>
        )}
      />
    </ListPageLayout>

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
    </>
  );
}

import {  useState, useMemo  } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
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
  MessageSquare,
  Building2,
  MapPin,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { FilterBar, ResponsiveList, ListPageLayout, type StatusFilterOption } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';

export function QuoteRequestsSent() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch sent quote requests
  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['quote-requests', 'sent', selectedStatus === 'all' ? undefined : selectedStatus, currentOrganization?.id],
    queryFn: () => quoteRequestsApi.getSent(selectedStatus === 'all' ? undefined : selectedStatus, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
  });

  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return quoteRequests;
    const q = searchTerm.toLowerCase();
    return quoteRequests.filter(
      (quote) =>
        quote.product_title?.toLowerCase().includes(q) ||
        quote.seller?.name?.toLowerCase().includes(q) ||
        quote.message?.toLowerCase().includes(q)
    );
  }, [quoteRequests, searchTerm]);

  const statusFilters: StatusFilterOption[] = [
    { value: 'all', label: t('quoteRequests.all', 'All') },
    { value: 'pending', label: t('quoteRequests.pending', 'Pending') },
    { value: 'quoted', label: t('quoteRequests.quoted', 'Quoted') },
    { value: 'accepted', label: t('quoteRequests.accepted', 'Accepted') },
    { value: 'declined', label: t('quoteRequests.declined', 'Declined') },
  ];

  // Update quote mutation (for accepting/declining)
  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      quoteRequestsApi.update(id, data, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      toast.success(t('quoteRequests.updateSuccess', 'Quote request updated successfully'));
    },
    onError: (error) => {
      toast.error(t('quoteRequests.updateError', 'Failed to update quote request'));
      console.error(error);
    },
  });

  const handleAccept = (quoteId: string) => {
    showConfirm(t('quoteRequests.confirmAccept', 'Accept this quote?'), async () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'accepted' },
      });
    });
  };

  const handleDecline = (quoteId: string) => {
    showConfirm(t('quoteRequests.confirmDecline', 'Decline this quote?'), async () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'declined' },
      });
    });
  };

  const handleCancel = (quoteId: string) => {
    showConfirm(t('quoteRequests.confirmCancel', 'Cancel this request?'), async () => {
      await updateQuoteMutation.mutateAsync({
        id: quoteId,
        data: { status: 'cancelled' },
      });
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

  return (
    <>
    <ListPageLayout
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('quoteRequests.searchPlaceholder', 'Search by product or seller...')}
          statusFilters={statusFilters}
          activeStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onClear={() => { setSearchTerm(''); setSelectedStatus('all'); }}
        />
      }
    >
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Seller Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">{t('quoteRequests.seller', 'Vendeur')}</h4>
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
                    <span>{t('quoteRequests.requestedOn', 'Demandé le')} {formatDate(quote.created_at)}</span>
                  </div>
                  {quote.viewed_at && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Eye className="h-4 w-4" />
                      <span>{t('quoteRequests.viewedOn', 'Vu le')} {formatDate(quote.viewed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Your Message */}
            {quote.message && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quoteRequests.yourMessage', 'Votre message:')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  &ldquo;{quote.message}&rdquo;
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
                      {t('quoteRequests.validUntil', 'Valide jusqu\'au')} {new Date(quote.quote_valid_until).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                {quote.requested_quantity && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('quoteRequests.estimatedTotal', 'Total estimé:')} <strong>{(quote.quoted_price * quote.requested_quantity).toLocaleString()} {quote.quoted_currency || DEFAULT_CURRENCY}</strong>
                  </p>
                )}
                {quote.seller_response && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quoteRequests.sellerResponse', 'Réponse du vendeur:')}</p>
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
                  <Button variant="green"
                    onClick={() => handleAccept(quote.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('quoteRequests.accept', 'Accepter le Devis')}
                  </Button>
                  <Button
                    onClick={() => handleDecline(quote.id)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('quoteRequests.decline', 'Refuser')}
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
                  {t('quoteRequests.cancel', 'Annuler la Demande')}
                </Button>
              )}

              {quote.seller?.email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${quote.seller.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('quoteRequests.contactSeller', 'Contacter le Vendeur')}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
        renderTableHeader={
          <>
            <TableHead>{t('quoteRequests.product', 'Product')}</TableHead>
            <TableHead>{t('quoteRequests.seller', 'Seller')}</TableHead>
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
            <TableCell>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{quote.seller?.name || '-'}</span>
              </div>
            </TableCell>
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
                {quote.status === 'quoted' && (
                  <>
                    <Button variant="green" size="sm" onClick={() => handleAccept(quote.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDecline(quote.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {['pending', 'viewed'].includes(quote.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(quote.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </>
        )}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </ListPageLayout>
    </>
  );
}

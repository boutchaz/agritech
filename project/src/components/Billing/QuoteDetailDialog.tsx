import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../MultiTenantAuthProvider';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceTotalsDisplay } from '../Accounting/TaxBreakdown';
import {
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Download,
  Edit,
  Loader2,
  Clock as ClockIcon,
  Circle,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import type { Quote, QuoteWithItems } from '@/hooks/useQuotes';
import { useConvertQuoteToOrder, useQuote } from '@/hooks/useQuotes';
import { formatCurrency } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

interface QuoteDetailDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (quote: Quote) => void;
  onDownloadPDF?: (quote: Quote) => void;
}

type TimelineStepKey = 'draft' | 'sent' | 'accepted' | 'converted';
type NormalizedStatus = TimelineStepKey | 'rejected' | 'cancelled' | 'expired';
type StepState = 'completed' | 'current' | 'upcoming' | 'cancelled';
type StatusActionKey = 'sent' | 'accepted' | 'rejected';

const statusOrder: TimelineStepKey[] = ['draft', 'sent', 'accepted', 'converted'];

const formatDateTime = (value: string | null | undefined, locale: Locale) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, 'PPp', { locale });
};

const toInputDate = (value: string | null | undefined) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const QuoteDetailDialog: React.FC<QuoteDetailDialogProps> = ({
  quote,
  open,
  onOpenChange,
  onEdit,
  onDownloadPDF,
}) => {
  const { t } = useTranslation();
  const { currentOrganization: _currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToOrder = useConvertQuoteToOrder();

  const isRTL = i18n.language === 'ar';

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'ar':
        return ar;
      default:
        return enUS;
    }
  };

  const timelineStepConfig: Record<TimelineStepKey, { label: string; description: string }> = {
    draft: {
      label: t('quotes.detail.timeline.draft.label'),
      description: t('quotes.detail.timeline.draft.description'),
    },
    sent: {
      label: t('quotes.detail.timeline.sent.label'),
      description: t('quotes.detail.timeline.sent.description'),
    },
    accepted: {
      label: t('quotes.detail.timeline.accepted.label'),
      description: t('quotes.detail.timeline.accepted.description'),
    },
    converted: {
      label: t('quotes.detail.timeline.converted.label'),
      description: t('quotes.detail.timeline.converted.description'),
    },
  };

  const statusActionCopy: Record<
    StatusActionKey,
    { title: string; body: string; confirmLabel: string }
  > = {
    sent: {
      title: t('quotes.detail.dialogs.send.title'),
      body: t('quotes.detail.dialogs.send.body'),
      confirmLabel: t('quotes.detail.dialogs.send.confirm'),
    },
    accepted: {
      title: t('quotes.detail.dialogs.accept.title'),
      body: t('quotes.detail.dialogs.accept.body'),
      confirmLabel: t('quotes.detail.dialogs.accept.confirm'),
    },
    rejected: {
      title: t('quotes.detail.dialogs.reject.title'),
      body: t('quotes.detail.dialogs.reject.body'),
      confirmLabel: t('quotes.detail.dialogs.reject.confirm'),
    },
  };

  // Fetch full quote with items when dialog is open
  const quoteId = quote?.id ?? null;
  const {
    data: quoteWithItems,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuote(open ? quoteId : null);

  // Use fetched quote with items if available, otherwise fallback to passed quote
  const resolvedQuote: QuoteWithItems | null = (quoteWithItems ?? quote ?? null) as QuoteWithItems | null;

  const [pendingStatus, setPendingStatus] = React.useState<StatusActionKey | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<{
    validUntil: string;
    paymentTerms: string;
    deliveryTerms: string;
    termsConditions: string;
  }>({
    validUntil: '',
    paymentTerms: '',
    deliveryTerms: '',
    termsConditions: '',
  });

  React.useEffect(() => {
    if (!resolvedQuote) {
      setIsEditingDetails(false);
      setEditFormData({
        validUntil: '',
        paymentTerms: '',
        deliveryTerms: '',
        termsConditions: '',
      });
      return;
    }

    setEditFormData({
      validUntil: toInputDate(resolvedQuote.valid_until),
      paymentTerms: resolvedQuote.payment_terms ?? '',
      deliveryTerms: resolvedQuote.delivery_terms ?? '',
      termsConditions: resolvedQuote.terms_and_conditions ?? '',
    });
    setIsEditingDetails(false);
  }, [resolvedQuote?.id]);

  // Update quote status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: Quote['status']) => {
      if (!resolvedQuote) throw new Error('No quote selected');

      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', resolvedQuote.id);

      if (error) throw error;

      // If status is 'accepted', automatically convert to sales order
      if (status === 'accepted') {
        return { shouldConvert: true };
      }
      return { shouldConvert: false };
    },
    onSuccess: async (result, status) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

      // If accepted, trigger automatic conversion to sales order
      if (result?.shouldConvert && resolvedQuote) {
        toast.success(t('quotes.detail.messages.quoteAccepted'));

        // Trigger conversion
        convertToOrder.mutate(resolvedQuote.id, {
          onSuccess: (salesOrder) => {
            toast.success(t('quotes.detail.messages.salesOrderCreated', { number: salesOrder.order_number }));
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(t('quotes.detail.messages.convertFailed', { error: error.message }));
          },
        });
      } else {
        toast.success(t('quotes.detail.messages.quoteMarked', { status: t(`quotes.status.${status}`) }));
      }
    },
    onError: (error) => {
      toast.error(t('quotes.detail.messages.updateFailed', { error: error.message }));
    },
  });

  const updateQuoteDetails = useMutation({
    mutationFn: async () => {
      if (!resolvedQuote) throw new Error('No quote selected');

      const { error } = await supabase
        .from('quotes')
        .update({
          valid_until: editFormData.validUntil || undefined,
          payment_terms: editFormData.paymentTerms || undefined,
          delivery_terms: editFormData.deliveryTerms || undefined,
          terms_and_conditions: editFormData.termsConditions || undefined,
        })
        .eq('id', resolvedQuote.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quotes.detail.messages.detailsUpdated'));
      setIsEditingDetails(false);
    },
    onError: (error) => {
      toast.error(t('quotes.detail.messages.updateDetailsFailed', { error: error.message }));
    },
  });

  const handleConvertToOrder = () => {
    if (!resolvedQuote) return;

    convertToOrder.mutate(resolvedQuote.id, {
      onSuccess: (salesOrder) => {
        toast.success(t('quotes.detail.messages.converted', { number: salesOrder.order_number }));
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t('quotes.detail.messages.convertError', { error: error.message }));
      },
    });
  };

  const handleDownload = async () => {
    if (!resolvedQuote) return;

    try {
      setIsDownloading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        toast.error(t('quotes.detail.messages.signInRequired'));
        return;
      }

      const backendUrl =
        import.meta.env.VITE_BACKEND_SERVICE_URL ||
        import.meta.env.VITE_SATELLITE_SERVICE_URL ||
        'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/billing/quotes/${resolvedQuote.id}/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        let errorMessage = t('quotes.detail.messages.pdfFailed');

        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');

      if (contentType?.includes('text/html')) {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.info(t('quotes.detail.messages.htmlFallback'));
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = resolvedQuote.quote_number ? `quote-${resolvedQuote.quote_number}.pdf` : 'quote.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
        toast.success(t('quotes.detail.messages.pdfDownloaded'));
      }
    } catch (error) {
      toast.error(t('quotes.detail.messages.downloadError', { error: error instanceof Error ? error.message : t('quotes.error.unknown') }));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditFieldChange = (field: keyof typeof editFormData) => (value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancelEdit = () => {
    if (!resolvedQuote) return;
    setEditFormData({
      validUntil: toInputDate(resolvedQuote.valid_until),
      paymentTerms: resolvedQuote.payment_terms ?? '',
      deliveryTerms: resolvedQuote.delivery_terms ?? '',
      termsConditions: resolvedQuote.terms_and_conditions ?? '',
    });
    setIsEditingDetails(false);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQuoteDetails.mutate();
  };

  if (!quoteId) return null;

  if (isDetailLoading || !resolvedQuote) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-w-md", isRTL && "text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
            <div className="size-8 animate-spin rounded-full border-b-2 border-emerald-500" />
            {t('quotes.detail.loading')}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (detailError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-w-md", isRTL && "text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-600 dark:text-red-400">
            {t('quotes.detail.error')}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const q = resolvedQuote;
  const normalizedStatus = q.status as NormalizedStatus;
  const currentIndex =
    normalizedStatus === 'cancelled' || normalizedStatus === 'rejected' || normalizedStatus === 'expired'
      ? statusOrder.indexOf('sent')
      : statusOrder.indexOf(normalizedStatus as TimelineStepKey);

  const hasReachedStep = (step: TimelineStepKey) => {
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected' || normalizedStatus === 'expired') {
      if (step === 'draft') return true;
      if (step === 'sent') return q.status !== 'draft';
      return false;
    }

    if (currentIndex === -1) {
      return step === 'draft';
    }

    return statusOrder.indexOf(step) <= currentIndex;
  };

  const getStepState = (step: TimelineStepKey): StepState => {
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected' || normalizedStatus === 'expired') {
      if (step === 'draft') return 'completed';
      if (step === 'sent' && q.status !== 'draft') return 'completed';
      return 'cancelled';
    }

    if (currentIndex === -1) {
      return step === 'draft' ? 'current' : 'upcoming';
    }

    const stepIndex = statusOrder.indexOf(step);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const getTimelineTimestamp = (step: TimelineStepKey) => {
    switch (step) {
      case 'draft':
        return q.created_at;
      case 'sent':
        return hasReachedStep('sent') ? q.updated_at : null;
      case 'accepted':
        return hasReachedStep('accepted') ? q.updated_at : null;
      case 'converted':
        return hasReachedStep('converted') ? q.updated_at : null;
      default:
        return null;
    }
  };

  const timelineSteps = statusOrder.map((key) => ({
    key,
    label: timelineStepConfig[key].label,
    description: timelineStepConfig[key].description,
    timestamp: getTimelineTimestamp(key),
  }));

  const canSend = q.status === 'draft';
  const canAccept = q.status === 'sent';
  const canReject = q.status === 'sent';
  const canConvert = q.status === 'accepted';
  const canDownload = q.status !== 'draft';
  const canEditDetails = ['draft', 'sent'].includes(q.status);

  const statusActions: Array<{
    key: StatusActionKey;
    label: string;
    icon: React.ReactNode;
    disabled: boolean;
  }> = [
    {
      key: 'sent',
      label: t('quotes.detail.actions.sendToCustomer'),
      icon: <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />,
      disabled: !canSend,
    },
    {
      key: 'accepted',
      label: t('quotes.detail.actions.markAccepted'),
      icon: <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />,
      disabled: !canAccept,
    },
    {
      key: 'rejected',
      label: t('quotes.detail.actions.markRejected'),
      icon: <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />,
      disabled: !canReject,
    },
  ];

  const availableStatusActions = statusActions.filter((action) => !action.disabled);

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'converted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", isRTL && "text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <div>
              <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <FileText className="h-5 w-5" />
                {t('quotes.detail.title', { number: q.quote_number })}
              </DialogTitle>
              <DialogDescription>{t('quotes.detail.subtitle')}</DialogDescription>
            </div>
            <Badge className={getStatusColor(q.status)}>{t(`quotes.status.${q.status}`)}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('quotes.detail.statusTimeline')}
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('quotes.detail.timelineDescription')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {timelineSteps.map((step, index) => {
                    const state = getStepState(step.key);
                    const timestampLabel = formatDateTime(step.timestamp, getLocale());
                    const nextState = timelineSteps[index + 1]
                      ? getStepState(timelineSteps[index + 1].key)
                      : null;
                    const circleClasses = (() => {
                      switch (state) {
                        case 'completed':
                          return 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300';
                        case 'current':
                          return 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300';
                        case 'cancelled':
                          return 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';
                        default:
                          return 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500';
                      }
                    })();
                    const lineClasses = (() => {
                      if (state === 'cancelled' || nextState === 'cancelled') {
                        return 'bg-red-200 dark:bg-red-900/40';
                      }
                      if (state === 'completed') {
                        return 'bg-emerald-200 dark:bg-emerald-900/40';
                      }
                      return 'bg-gray-200 dark:bg-gray-800';
                    })();
                    const icon = (() => {
                      switch (state) {
                        case 'completed':
                          return <CheckCircle2 className="h-4 w-4" />;
                        case 'current':
                          return <ClockIcon className="h-4 w-4" />;
                        case 'cancelled':
                          return <XCircle className="h-4 w-4" />;
                        default:
                          return <Circle className="h-3 w-3" />;
                      }
                    })();

                    return (
                      <div key={step.key} className="grid grid-cols-[auto,1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex size-9 items-center justify-center rounded-full border ${circleClasses}`}
                          >
                            {icon}
                          </div>
                          {index < timelineSteps.length - 1 && (
                            <div
                              className={`mt-1 w-px flex-1 ${lineClasses}`}
                              style={{ minHeight: '2.5rem' }}
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {step.label}
                            </p>
                            {timestampLabel && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {timestampLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(normalizedStatus === 'cancelled' ||
                  normalizedStatus === 'rejected' ||
                  normalizedStatus === 'expired') && (
                  <div className={cn("mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300", isRTL && "flex-row-reverse")}>
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>
                      {t('quotes.detail.messages.locked', { status: t(`quotes.status.${normalizedStatus}`) })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('quotes.detail.quickActions')}
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('quotes.detail.actionsDescription')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={onDownloadPDF && quote ? () => onDownloadPDF(quote) : handleDownload}
                    disabled={!canDownload || isDownloading}
                    variant="outline"
                    className={cn("justify-start", isRTL && "flex-row-reverse")}
                  >
                    {isDownloading ? (
                      <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                    ) : (
                      <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    )}
                    {t('quotes.detail.downloadPdf')}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canDownload ? t('quotes.detail.downloadPdfDescription') : t('quotes.detail.downloadPdfDisabled')}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => setIsEditingDetails(true)}
                    disabled={!canEditDetails || isEditingDetails}
                    variant="outline"
                    className={cn("justify-start", isRTL && "flex-row-reverse")}
                  >
                    <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {t('quotes.detail.editDetails')}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canEditDetails ? t('quotes.detail.editDetailsDescription') : t('quotes.detail.editDetailsDisabled')}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleConvertToOrder}
                    disabled={!canConvert || convertToOrder.isPending}
                    variant="outline"
                    className={cn("justify-start", isRTL && "flex-row-reverse")}
                  >
                    {convertToOrder.isPending ? (
                      <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                    ) : (
                      <ArrowRight className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    )}
                    {t('quotes.detail.convertToOrder')}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canConvert ? t('quotes.detail.convertDescription') : t('quotes.detail.convertDisabled')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('quotes.detail.quoteInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.customer')}:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{q.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.quoteDate')}:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {format(new Date(q.quote_date), 'P', { locale: getLocale() })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.validUntil')}:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {format(new Date(q.valid_until), 'P', { locale: getLocale() })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.currency')}:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{q.currency_code}</p>
                </div>
                {q.payment_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.paymentTerms')}:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {q.payment_terms}
                    </p>
                  </div>
                )}
                {q.delivery_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('quotes.detail.deliveryTerms')}:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {q.delivery_terms}
                    </p>
                  </div>
                )}
              </div>

              {isEditingDetails && (
                <form
                  className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                  onSubmit={handleEditSubmit}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="valid-until">{t('quotes.detail.editForm.validUntil')}</Label>
                      <Input
                        id="valid-until"
                        type="date"
                        value={editFormData.validUntil}
                        onChange={(event) => handleEditFieldChange('validUntil')(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-terms">{t('quotes.detail.editForm.paymentTerms')}</Label>
                      <Input
                        id="payment-terms"
                        value={editFormData.paymentTerms}
                        onChange={(event) =>
                          handleEditFieldChange('paymentTerms')(event.target.value)
                        }
                        placeholder={t('quotes.detail.editForm.paymentTermsPlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="delivery-terms">{t('quotes.detail.editForm.deliveryTerms')}</Label>
                    <Textarea
                      id="delivery-terms"
                      value={editFormData.deliveryTerms}
                      onChange={(event) =>
                        handleEditFieldChange('deliveryTerms')(event.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms-conditions">{t('quotes.detail.editForm.termsConditions')}</Label>
                    <Textarea
                      id="terms-conditions"
                      value={editFormData.termsConditions}
                      onChange={(event) =>
                        handleEditFieldChange('termsConditions')(event.target.value)
                      }
                      rows={4}
                      placeholder={t('quotes.detail.editForm.termsPlaceholder')}
                    />
                  </div>
                  <div className={cn("flex items-center justify-end gap-2", isRTL && "flex-row-reverse")}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updateQuoteDetails.isPending}
                    >
                      {t('quotes.detail.editForm.cancel')}
                    </Button>
                    <Button type="submit" disabled={updateQuoteDetails.isPending}>
                      {updateQuoteDetails.isPending ? (
                        <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                      ) : (
                        <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                      )}
                      {t('quotes.detail.editForm.saveChanges')}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('quotes.detail.lineItems')}
                </CardTitle>
                {canEditDetails && (!q.items || q.items.length === 0) && quote && (
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(quote)}>
                    <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {t('quotes.detail.addItems')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.form.item')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.form.description')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.form.quantity')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.form.rate')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.form.amount')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.form.tax')}
                      </th>
                      <th className={cn("py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.detail.totals')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items && q.items.length > 0 ? (
                      q.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                          <td className={cn("py-2 px-2 text-sm font-medium text-gray-900 dark:text-white", isRTL && "text-right")}>
                            {item.item_name}
                          </td>
                          <td className={cn("py-2 px-2 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                            {item.description || '-'}
                          </td>
                          <td className={cn("py-2 px-2 text-sm text-gray-900 dark:text-white", isRTL ? "text-left" : "text-right")}>
                            {item.quantity}
                          </td>
                          <td className={cn("py-2 px-2 text-sm text-gray-900 dark:text-white", isRTL ? "text-left" : "text-right")}>
                            {formatCurrency(Number(item.rate ?? 0), q.currency_code)}
                          </td>
                          <td className={cn("py-2 px-2 text-sm text-gray-900 dark:text-white", isRTL ? "text-left" : "text-right")}>
                            {formatCurrency(Number(item.amount ?? 0), q.currency_code)}
                          </td>
                          <td className={cn("py-2 px-2 text-sm text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                            {formatCurrency(Number(item.tax_amount ?? 0), q.currency_code)}
                          </td>
                          <td className={cn("py-2 px-2 text-sm font-medium text-gray-900 dark:text-white", isRTL ? "text-left" : "text-right")}>
                            {formatCurrency(
                              Number(item.amount ?? 0) + Number(item.tax_amount ?? 0),
                              q.currency_code
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className={cn("py-8 text-center text-sm text-gray-500 dark:text-gray-400", isRTL && "text-right")}>
                          {t('quotes.detail.noItems')}
                          {canEditDetails ? t('quotes.detail.noItemsWithEdit') : t('quotes.detail.noItemsWithoutEdit')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('quotes.detail.totals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTotalsDisplay
                subtotal={Number(q.subtotal)}
                taxTotal={Number(q.tax_total)}
                grandTotal={Number(q.grand_total)}
                currency={q.currency_code}
              />
            </CardContent>
          </Card>

          {q.terms_and_conditions && !isEditingDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('quotes.detail.termsConditions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {q.terms_and_conditions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions - Matching Purchase Order Pattern */}
          <div className={cn("flex items-center justify-between gap-2 pt-4 border-t", isRTL && "flex-row-reverse")}>
            {/* Left side - Download, Edit, Convert */}
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Button
                onClick={onDownloadPDF && quote ? () => onDownloadPDF(quote) : handleDownload}
                disabled={isDownloading}
                variant="outline"
              >
                {isDownloading ? (
                  <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                ) : (
                  <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                )}
                {t('quotes.detail.downloadPdf')}
              </Button>
              {onEdit && quote && quote.status !== 'converted' && quote.status !== 'cancelled' && (
                <Button onClick={() => onEdit(quote)} variant="outline">
                  <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('quotes.form.edit')}
                </Button>
              )}
              {canConvert && (
                <Button onClick={handleConvertToOrder} disabled={convertToOrder.isPending} variant="outline">
                  {convertToOrder.isPending ? (
                    <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                  ) : (
                    <ArrowRight className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  )}
                  {t('quotes.detail.convertToOrder')}
                </Button>
              )}
            </div>

            {/* Right side - Status actions and Close */}
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              {availableStatusActions.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => setPendingStatus(action.key)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('quotes.detail.actions.close')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
          }
        }}
      >
        <AlertDialogContent>
          {pendingStatus ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{statusActionCopy[pendingStatus].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {statusActionCopy[pendingStatus].body}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={cn(isRTL && "flex-row-reverse")}>
                <AlertDialogCancel disabled={updateStatus.isPending}>{t('app.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={updateStatus.isPending}
                  onClick={() => {
                    if (!pendingStatus) return;
                    updateStatus.mutate(pendingStatus, {
                      onSettled: () => setPendingStatus(null),
                    });
                  }}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                  ) : null}
                  {statusActionCopy[pendingStatus].confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

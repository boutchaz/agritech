import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../MultiTenantAuthProvider';
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

const timelineStepConfig: Record<TimelineStepKey, { label: string; description: string }> = {
  draft: {
    label: 'Draft',
    description: 'Quote created and stored as draft.',
  },
  sent: {
    label: 'Sent',
    description: 'Quote sent to customer for review.',
  },
  accepted: {
    label: 'Accepted',
    description: 'Customer accepted the quote.',
  },
  converted: {
    label: 'Converted',
    description: 'Quote converted to Sales Order.',
  },
};

const statusActionCopy: Record<
  StatusActionKey,
  { title: string; body: string; confirmLabel: string }
> = {
  sent: {
    title: 'Send to Customer',
    body: 'This will mark the quote as sent and notify the customer.',
    confirmLabel: 'Send Quote',
  },
  accepted: {
    title: 'Accept Quote & Create Sales Order',
    body: 'This will mark the quote as accepted and automatically create a Sales Order to begin fulfillment.',
    confirmLabel: 'Accept & Create Order',
  },
  rejected: {
    title: 'Mark as Rejected',
    body: 'This will close the quote as rejected. This action can be reversed.',
    confirmLabel: 'Mark as Rejected',
  },
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
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
  const { currentOrganization: _currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToOrder = useConvertQuoteToOrder();

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
        toast.success('Quote accepted. Creating sales order...');

        // Trigger conversion
        convertToOrder.mutate(resolvedQuote.id, {
          onSuccess: (salesOrder) => {
            toast.success(`Sales Order #${salesOrder.order_number} created successfully`);
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error('Failed to convert to sales order: ' + error.message);
          },
        });
      } else {
        toast.success(`Quote marked as ${status}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to update quote status: ' + error.message);
    },
  });

  const updateQuoteDetails = useMutation({
    mutationFn: async () => {
      if (!resolvedQuote) throw new Error('No quote selected');

      const { error } = await supabase
        .from('quotes')
        .update({
          valid_until: editFormData.validUntil || null,
          payment_terms: editFormData.paymentTerms || null,
          delivery_terms: editFormData.deliveryTerms || null,
          terms_and_conditions: editFormData.termsConditions || null,
        })
        .eq('id', resolvedQuote.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote details updated');
      setIsEditingDetails(false);
    },
    onError: (error) => {
      toast.error('Failed to update quote: ' + error.message);
    },
  });

  const handleConvertToOrder = () => {
    if (!resolvedQuote) return;

    convertToOrder.mutate(resolvedQuote.id, {
      onSuccess: (salesOrder) => {
        toast.success(`Quote converted to Sales Order #${salesOrder.order_number}`);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error('Failed to convert quote: ' + error.message);
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
        toast.error('Please sign in to download the quote.');
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
        let errorMessage = 'Failed to generate PDF';

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
        toast.info(
          'PDF service not configured. Opened a printable version in a new tab. Use the browser print dialog to export to PDF.'
        );
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
        toast.success('Quote PDF downloaded');
      }
    } catch (error) {
      toast.error(
        'Failed to download quote: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
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
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
            <div className="size-8 animate-spin rounded-full border-b-2 border-emerald-500" />
            Loading quote details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (detailError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-600 dark:text-red-400">
            Failed to load quote details.
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
      label: 'Send to Customer',
      icon: <Send className="mr-2 h-4 w-4" />,
      disabled: !canSend,
    },
    {
      key: 'accepted',
      label: 'Mark as Accepted',
      icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      disabled: !canAccept,
    },
    {
      key: 'rejected',
      label: 'Mark as Rejected',
      icon: <XCircle className="mr-2 h-4 w-4" />,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quote #{q.quote_number}
              </DialogTitle>
              <DialogDescription>View quote details and manage status</DialogDescription>
            </div>
            <Badge className={getStatusColor(q.status)}>{q.status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Status Timeline
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Track each step of the quote lifecycle.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {timelineSteps.map((step, index) => {
                    const state = getStepState(step.key);
                    const timestampLabel = formatDateTime(step.timestamp);
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
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>
                      This quote was {normalizedStatus}. Remaining workflow actions are locked.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Quick Actions
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Perform the next step based on the current quote status.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={onDownloadPDF ? () => onDownloadPDF(quote) : handleDownload}
                    disabled={!canDownload || isDownloading}
                    variant="outline"
                    className="justify-start"
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canDownload
                      ? 'Generate a PDF copy for customer or records.'
                      : 'Send the quote before generating a PDF.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => setIsEditingDetails(true)}
                    disabled={!canEditDetails || isEditingDetails}
                    variant="outline"
                    className="justify-start"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Quote Details
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canEditDetails
                      ? 'Adjust validity, terms, or conditions before finalizing.'
                      : 'Editing is limited to draft or sent quotes.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleConvertToOrder}
                    disabled={!canConvert || convertToOrder.isPending}
                    variant="outline"
                    className="justify-start"
                  >
                    {convertToOrder.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Convert to Sales Order
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canConvert
                      ? 'Convert this accepted quote to a sales order.'
                      : 'Quote must be accepted before conversion.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Quote Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{q.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Quote Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(q.quote_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(q.valid_until).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{q.currency_code}</p>
                </div>
                {q.payment_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {q.payment_terms}
                    </p>
                  </div>
                )}
                {q.delivery_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Terms:</span>
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
                      <Label htmlFor="valid-until">Valid Until Date</Label>
                      <Input
                        id="valid-until"
                        type="date"
                        value={editFormData.validUntil}
                        onChange={(event) => handleEditFieldChange('validUntil')(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-terms">Payment Terms</Label>
                      <Input
                        id="payment-terms"
                        value={editFormData.paymentTerms}
                        onChange={(event) =>
                          handleEditFieldChange('paymentTerms')(event.target.value)
                        }
                        placeholder="e.g. Net 30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="delivery-terms">Delivery Terms</Label>
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
                    <Label htmlFor="terms-conditions">Terms & Conditions</Label>
                    <Textarea
                      id="terms-conditions"
                      value={editFormData.termsConditions}
                      onChange={(event) =>
                        handleEditFieldChange('termsConditions')(event.target.value)
                      }
                      rows={4}
                      placeholder="Add terms and conditions"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updateQuoteDetails.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateQuoteDetails.isPending}>
                      {updateQuoteDetails.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Line Items
                </CardTitle>
                {canEditDetails && (!q.items || q.items.length === 0) && (
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(quote)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Add Items
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Item
                      </th>
                      <th className="py-2 px-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Rate
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tax
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items && q.items.length > 0 ? (
                      q.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-2 text-sm font-medium text-gray-900 dark:text-white">
                            {item.item_name}
                          </td>
                          <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                            {item.description || '-'}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(Number(item.rate ?? 0), q.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(Number(item.amount ?? 0), q.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                            {formatCurrency(Number(item.tax_amount ?? 0), q.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(
                              Number(item.amount ?? 0) + Number(item.tax_amount ?? 0),
                              q.currency_code
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No line items found.
                          {canEditDetails ? ' Use the "Add Items" button above to add line items.' : ' This quote has no line items.'}
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
                Totals
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
                  Terms & Conditions
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
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            {/* Left side - Download, Edit, Convert */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onDownloadPDF ? () => onDownloadPDF(quote) : handleDownload}
                disabled={isDownloading}
                variant="outline"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
              {onEdit && quote.status !== 'converted' && quote.status !== 'cancelled' && (
                <Button onClick={() => onEdit(quote)} variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Quote
                </Button>
              )}
              {canConvert && (
                <Button onClick={handleConvertToOrder} disabled={convertToOrder.isPending} variant="outline">
                  {convertToOrder.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Convert to Sales Order
                </Button>
              )}
            </div>

            {/* Right side - Status actions and Close */}
            <div className="flex items-center gap-2">
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
                Close
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
              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateStatus.isPending}>Cancel</AlertDialogCancel>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QuoteRequest } from '../../lib/api/quote-requests';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/label';
import { DollarSign, Calendar, Send } from 'lucide-react';
import { DEFAULT_CURRENCY } from '../../utils/currencies';

interface QuoteResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteRequest;
  onSubmit: (data: {
    quoted_price: number;
    quoted_currency: string;
    seller_response: string;
    quote_valid_until?: string;
    status: 'quoted';
  }) => Promise<void>;
}

export function QuoteResponseDialog({
  open,
  onOpenChange,
  quote,
  onSubmit,
}: QuoteResponseDialogProps) {
  const { t } = useTranslation();
  const [quotedPrice, setQuotedPrice] = useState<string>(
    quote.item?.standard_rate?.toString() || quote.listing?.price?.toString() || ''
  );
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [response, setResponse] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotedPrice || !response) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        quoted_price: parseFloat(quotedPrice),
        quoted_currency: currency,
        seller_response: response,
        quote_valid_until: validUntil || undefined,
        status: 'quoted',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('dialogs.quoteResponse.title')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.quoteResponse.description', { product: quote.product_title })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">{t('dialogs.quoteResponse.customerInfo')}</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>{t('dialogs.quoteResponse.name')}:</strong> {quote.buyer_contact_name || quote.requester?.name}</p>
                {quote.buyer_contact_email && (
                  <p><strong>{t('dialogs.quoteResponse.email')}:</strong> {quote.buyer_contact_email}</p>
                )}
                {quote.buyer_contact_phone && (
                  <p><strong>{t('dialogs.quoteResponse.phone')}:</strong> {quote.buyer_contact_phone}</p>
                )}
                {quote.requested_quantity && (
                  <p>
                    <strong>{t('dialogs.quoteResponse.requestedQuantity')}:</strong> {quote.requested_quantity} {quote.unit_of_measure || t('dialogs.quoteResponse.units')}
                  </p>
                )}
              </div>
              {quote.message && (
                <div className="mt-2">
                  <p className="font-medium text-sm mb-1">{t('dialogs.quoteResponse.customerMessage')}:</p>
                  <p className="text-sm italic text-gray-600 dark:text-gray-400">
                    "{quote.message}"
                  </p>
                </div>
              )}
            </div>

            {/* Quoted Price */}
            <div className="space-y-2">
              <Label htmlFor="quotedPrice">
                <DollarSign className="inline h-4 w-4 mr-1" />
                {t('dialogs.quoteResponse.quotedPrice')} *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="quotedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="flex-1"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="MAD">MAD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {quote.unit_of_measure && (
                <p className="text-xs text-gray-500">{t('dialogs.quoteResponse.pricePerUnit', { unit: quote.unit_of_measure })}</p>
              )}
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">
                <Calendar className="inline h-4 w-4 mr-1" />
                {t('dialogs.quoteResponse.validUntil')}
              </Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Response Message */}
            <div className="space-y-2">
              <Label htmlFor="response">
                {t('dialogs.quoteResponse.messageConditions')} *
              </Label>
              <Textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={t('dialogs.quoteResponse.messagePlaceholder')}
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                {t('dialogs.quoteResponse.messageHint')}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                {t('dialogs.quoteResponse.summary')}
              </p>
              <div className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
                <p>
                  {t('dialogs.quoteResponse.proposedPrice')}: <strong>{quotedPrice || '0'} {currency}</strong>
                  {quote.unit_of_measure && ` / ${quote.unit_of_measure}`}
                </p>
                {quote.requested_quantity && quotedPrice && (
                  <p>
                    {t('dialogs.quoteResponse.estimatedTotal')}: <strong>{(parseFloat(quotedPrice) * quote.requested_quantity).toFixed(2)} {currency}</strong>
                  </p>
                )}
                {validUntil && (
                  <p>
                    {t('dialogs.quoteResponse.offerValidUntil')}: <strong>{new Date(validUntil).toLocaleDateString('fr-FR')}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('app.cancel')}
            </Button>
            <Button variant="green" type="submit" disabled={submitting || !quotedPrice || !response} >
              {submitting ? (
                <>{t('dialogs.quoteResponse.sending')}</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('dialogs.quoteResponse.sendQuote')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

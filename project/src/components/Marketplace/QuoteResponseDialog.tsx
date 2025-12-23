import React, { useState } from 'react';
import { QuoteRequest } from '../../lib/api/quote-requests';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { DollarSign, Calendar, Send } from 'lucide-react';

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
  const [quotedPrice, setQuotedPrice] = useState<string>(
    quote.item?.standard_rate?.toString() || quote.listing?.price?.toString() || ''
  );
  const [currency, setCurrency] = useState('MAD');
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
            <DialogTitle>Envoyer un Devis</DialogTitle>
            <DialogDescription>
              Répondez à la demande de devis pour "{quote.product_title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Informations du client</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Nom:</strong> {quote.buyer_contact_name || quote.requester?.name}</p>
                {quote.buyer_contact_email && (
                  <p><strong>Email:</strong> {quote.buyer_contact_email}</p>
                )}
                {quote.buyer_contact_phone && (
                  <p><strong>Téléphone:</strong> {quote.buyer_contact_phone}</p>
                )}
                {quote.requested_quantity && (
                  <p>
                    <strong>Quantité demandée:</strong> {quote.requested_quantity} {quote.unit_of_measure || 'unités'}
                  </p>
                )}
              </div>
              {quote.message && (
                <div className="mt-2">
                  <p className="font-medium text-sm mb-1">Message du client:</p>
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
                Prix Proposé *
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
                <p className="text-xs text-gray-500">Prix par {quote.unit_of_measure}</p>
              )}
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">
                <Calendar className="inline h-4 w-4 mr-1" />
                Valide jusqu'au (optionnel)
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
                Message / Conditions *
              </Label>
              <Textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Ex: Prix unitaire pour une commande de minimum 100 unités. Livraison incluse dans un rayon de 50km..."
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                Ajoutez des détails sur votre offre, conditions de paiement, délais de livraison, etc.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Récapitulatif
              </p>
              <div className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
                <p>
                  Prix proposé: <strong>{quotedPrice || '0'} {currency}</strong>
                  {quote.unit_of_measure && ` / ${quote.unit_of_measure}`}
                </p>
                {quote.requested_quantity && quotedPrice && (
                  <p>
                    Total estimé: <strong>{(parseFloat(quotedPrice) * quote.requested_quantity).toFixed(2)} {currency}</strong>
                  </p>
                )}
                {validUntil && (
                  <p>
                    Offre valide jusqu'au: <strong>{new Date(validUntil).toLocaleDateString('fr-FR')}</strong>
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
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !quotedPrice || !response}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>Envoi en cours...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le Devis
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

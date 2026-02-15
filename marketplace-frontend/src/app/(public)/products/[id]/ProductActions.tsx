'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { QuoteRequestsApi } from '@/lib/quote-requests-api';
import { Loader2, Mail, Phone, Check, MapPin, Building2, BadgeCheck, ExternalLink } from 'lucide-react';

interface Seller {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface ProductActionsProps {
  product: {
    id: string;
    title: string;
    description?: string;
    unit?: string;
    organization_id?: string;
    source?: string;
    seller?: Seller;
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = !!user;
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  const handleRequestQuote = async () => {
    if (!isLoggedIn) {
      router.push('/login?redirect=' + encodeURIComponent(`/products/${product.id}`));
      return;
    }

    const contactName = user?.user_metadata?.full_name || user?.email || '';
    const contactEmail = user?.email || '';

    setSubmittingQuote(true);
    try {
      await QuoteRequestsApi.create({
        item_id: product.source === 'inventory_item' ? product.id : undefined,
        listing_id: product.source === 'marketplace_listing' ? product.id : undefined,
        product_title: product.title,
        product_description: product.description,
        requested_quantity: 1,
        unit_of_measure: product.unit,
        message: '',
        buyer_contact_name: contactName,
        buyer_contact_email: contactEmail,
        seller_organization_id: product.organization_id || product.seller?.id || '',
      });

      setQuoteSubmitted(true);
      setTimeout(() => {
        setQuoteSubmitted(false);
        router.push('/dashboard/quote-requests');
      }, 2000);
    } catch (error) {
      console.error('Failed to request quote:', error);
      alert('Échec de l\'envoi de la demande de devis. Veuillez réessayer.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleContactSeller = () => {
    if (!isLoggedIn) {
      router.push('/login?redirect=' + encodeURIComponent(`/products/${product.id}`));
      return;
    }
    if (product.seller) {
      router.push(`/sellers/${product.seller.slug || product.seller.id}`);
    }
  };

  return (
    <>
      {product.seller && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendu par</h2>
          <Link
            href={`/sellers/${product.seller.slug || product.seller.id}`}
            className="flex items-center gap-4 group"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.seller.logo_url ? (
                <img
                  src={product.seller.logo_url}
                  alt={product.seller.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-7 w-7 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 group-hover:text-emerald-600 transition">
                  {product.seller.name}
                </p>
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              </div>
              {product.seller.city && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {product.seller.city}
                </p>
              )}
            </div>
            <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-emerald-500" />
          </Link>

          {!authLoading && !isLoggedIn && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 text-center mb-3">
                Connectez-vous pour voir les coordonnées du vendeur
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
                className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
              >
                Se connecter
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 pt-6">
        <button
          onClick={handleRequestQuote}
          disabled={submittingQuote || quoteSubmitted}
          className={`w-full px-6 py-4 rounded-xl transition font-medium text-lg flex items-center justify-center gap-2 ${
            quoteSubmitted
              ? 'bg-green-600 text-white'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submittingQuote ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi en cours...
            </>
          ) : quoteSubmitted ? (
            <>
              <Check className="w-5 h-5" />
              Demande envoyée!
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Demander un devis
            </>
          )}
        </button>
        <button
          onClick={handleContactSeller}
          className="w-full px-6 py-4 border-2 border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 transition font-medium text-lg flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Contacter le fournisseur
        </button>

        {!authLoading && !isLoggedIn && (
          <p className="text-sm text-gray-500 text-center pt-2">
            Connectez-vous pour demander un devis ou contacter le vendeur
          </p>
        )}

        {quoteSubmitted && (
          <p className="text-sm text-green-600 text-center pt-2">
            Le vendeur a reçu votre demande par email et dans son tableau de bord.
          </p>
        )}
      </div>
    </>
  );
}

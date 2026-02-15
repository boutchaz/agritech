'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateQuoteRequest } from '@/hooks/useQuoteRequests';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface QuoteRequestButtonProps {
  product: {
    id: string;
    title: string;
    description?: string;
    seller?: {
      id: string;
      name: string;
    };
  };
}

export function QuoteRequestButton({ product }: QuoteRequestButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const createMutation = useCreateQuoteRequest();

  const [formData, setFormData] = useState({
    requested_quantity: 1,
    unit_of_measure: 'unité',
    message: '',
    buyer_contact_name: '',
    buyer_contact_email: '',
    buyer_contact_phone: '',
  });

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex-1 px-6 py-4 border-2 border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 transition font-medium text-center flex items-center justify-center gap-2"
      >
        <MessageCircle className="h-5 w-5" />
        Connectez-vous pour demander un devis
      </Link>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.seller?.id) return;

    try {
      await createMutation.mutateAsync({
        listing_id: product.id,
        product_title: product.title,
        product_description: product.description,
        seller_organization_id: product.seller.id,
        ...formData,
      });
      setIsOpen(false);
      setFormData({
        requested_quantity: 1,
        unit_of_measure: 'unité',
        message: '',
        buyer_contact_name: '',
        buyer_contact_email: '',
        buyer_contact_phone: '',
      });
    } catch (error) {
      console.error('Failed to create quote request:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 px-6 py-4 border-2 border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 transition font-medium flex items-center justify-center gap-2"
      >
        <MessageCircle className="h-5 w-5" />
        Demander un devis
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Demander un devis</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Produit</p>
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-gray-500 mt-1">Vendeur: {product.seller?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité souhaitée *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requested_quantity}
                    onChange={(e) => setFormData({ ...formData, requested_quantity: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Unité"
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Décrivez vos besoins spécifiques..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Vos coordonnées</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nom complet *"
                    required
                    value={formData.buyer_contact_name}
                    onChange={(e) => setFormData({ ...formData, buyer_contact_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    value={formData.buyer_contact_email}
                    onChange={(e) => setFormData({ ...formData, buyer_contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={formData.buyer_contact_phone}
                    onChange={(e) => setFormData({ ...formData, buyer_contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'Envoyer la demande'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

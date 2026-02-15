'use client';

import { useState } from 'react';
import { useSentQuoteRequests, useAcceptQuoteRequest, useDeclineQuoteRequest } from '@/hooks/useQuoteRequests';
import { useToast } from '@/hooks/useToast';
import { BadgeCheck, Clock, Eye, MessageCircle, X, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  viewed: { label: 'Vue', color: 'bg-blue-100 text-blue-800', icon: Eye },
  quoted: { label: 'Devis reçu', color: 'bg-emerald-100 text-emerald-800', icon: BadgeCheck },
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: X },
};

export default function QuoteRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: requests, isLoading } = useSentQuoteRequests(
    statusFilter === 'all' ? undefined : statusFilter,
    { refetchInterval: 30000 }
  );
  const acceptMutation = useAcceptQuoteRequest();
  const declineMutation = useDeclineQuoteRequest();
  const { toasts, toast, dismiss } = useToast();

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes demandes de devis</h1>
          <p className="mt-2 text-gray-600">Suivez vos demandes de devis envoyées aux vendeurs</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'pending', label: 'En attente' },
            { value: 'viewed', label: 'Vues' },
            { value: 'quoted', label: 'Devis reçus' },
            { value: 'accepted', label: 'Acceptées' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                statusFilter === filter.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement...</span>
          </div>
        ) : requests?.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de devis</h3>
            <p className="text-gray-600 mb-6">Parcourez les produits et envoyez votre première demande</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
            >
              Parcourir les produits
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests?.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div key={request.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Demande #{request.id?.slice(0, 8)}</p>
                      <h3 className="font-semibold text-lg">{request.product_title}</h3>
                      <p className="text-sm text-gray-600">
                        Vendeur: {request.seller?.name || 'Inconnu'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Quantité demandée</p>
                      <p className="font-medium">{request.requested_quantity} {request.unit_of_measure}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{new Date(request.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {request.quoted_price && (
                    <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-emerald-600 mb-1">Prix proposé par le vendeur:</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {request.quoted_price.toLocaleString('fr-MA')} {request.quoted_currency || 'MAD'}
                      </p>
                    </div>
                  )}

                  {request.message && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-600">{request.message}</p>
                    </div>
                  )}

                  {request.seller_response && (
                    <div className="bg-emerald-50 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-emerald-800 mb-1">Réponse du vendeur:</p>
                      <p className="text-sm text-emerald-700">{request.seller_response}</p>
                    </div>
                  )}

                  {request.status === 'quoted' && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={async () => {
                          try {
                            await declineMutation.mutateAsync(request.id);
                            toast({
                              title: 'Demande refusée',
                              description: 'Le vendeur a été notifié.',
                            });
                          } catch {
                            toast({
                              title: 'Erreur',
                              description: 'Impossible de refuser la demande.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={declineMutation.isPending}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        {declineMutation.isPending ? '...' : 'Refuser'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await acceptMutation.mutateAsync(request.id);
                            toast({
                              title: 'Devis accepté !',
                              description: 'Le vendeur va vous contacter pour finaliser la commande.',
                            });
                          } catch {
                            toast({
                              title: 'Erreur',
                              description: "Impossible d'accepter le devis.",
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={acceptMutation.isPending}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
                      >
                        {acceptMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Accepter le devis'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg p-4 shadow-lg max-w-sm ${
                t.variant === 'destructive'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{t.title}</p>
                  {t.description && (
                    <p className={`text-sm mt-1 ${t.variant === 'destructive' ? 'text-red-100' : 'text-gray-600'}`}>
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className={`shrink-0 ${t.variant === 'destructive' ? 'text-red-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

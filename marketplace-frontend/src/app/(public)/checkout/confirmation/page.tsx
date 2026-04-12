'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Package, ArrowRight, Loader2, Leaf, ShoppingBag } from 'lucide-react';
import { ApiClient, Order } from '@/lib/api';

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrder() {
            if (!orderId) return;

            try {
                const data = await ApiClient.getOrder(orderId);
                setOrder(data);
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, [orderId]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <nav className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">AgroGina</span>
                    </Link>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-16">
                {/* Success Icon */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Commande confirmee!</h1>
                    <p className="text-gray-600">
                        Merci pour votre commande. Vous recevrez bientot une confirmation.
                    </p>
                </div>

                {order && (
                    <div className="bg-white rounded-lg border p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Details de la commande</h2>
                            <span className="text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3 mb-6">
                            {order.items?.map((item, index) => (
                                <div key={item.title} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.title}</p>
                                        <p className="text-sm text-gray-500">
                                            {item.quantity} x {formatPrice(item.unit_price)}
                                        </p>
                                    </div>
                                    <p className="font-medium text-gray-900">
                                        {formatPrice(item.quantity * item.unit_price)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <hr className="my-4" />

                        <div className="flex justify-between items-center mb-6">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="text-xl font-bold text-green-600">{formatPrice(order.total_amount)}</span>
                        </div>

                        {/* Shipping Details */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Adresse de livraison</h3>
                            <div className="text-sm text-gray-600">
                                <p>{order.shipping_details?.name}</p>
                                <p>{order.shipping_details?.address}</p>
                                <p>{order.shipping_details?.city} {order.shipping_details?.postal_code}</p>
                                <p>{order.shipping_details?.phone}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Next Steps */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Prochaines etapes
                    </h3>
                    <ul className="text-sm text-green-700 space-y-2">
                        <li>Le vendeur va confirmer votre commande</li>
                        <li>Vous serez notifie lors de l'expedition</li>
                        <li>Paiement a la livraison en especes</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/orders"
                        className="flex-1 py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-center flex items-center justify-center gap-2"
                    >
                        Voir mes commandes
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/products"
                        className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Continuer les achats
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        }>
            <ConfirmationContent />
        </Suspense>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package,
    Loader2,
    ShoppingBag,
    Clock,
    CheckCircle,
    Truck,
    XCircle,
    AlertCircle,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import { Order } from '@/lib/api';
import { useOrders, useCancelOrder } from '@/hooks/useOrders';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    confirmed: { label: 'Confirmee', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    shipped: { label: 'Expediee', color: 'bg-purple-100 text-purple-700', icon: Truck },
    delivered: { label: 'Livree', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-700', icon: XCircle },
    disputed: { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function OrdersPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'all' | 'buyer' | 'seller'>('buyer');

    const { data: orders = [], isLoading: loading } = useOrders();
    const cancelOrder = useCancelOrder();

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(price);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Voulez-vous vraiment annuler cette commande?')) return;

        try {
            await cancelOrder.mutateAsync(orderId);
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Echec de l\'annulation de la commande');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 pt-24 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/products"
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Mes Commandes</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('buyer')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                            activeTab === 'buyer'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Mes achats
                    </button>
                    <button
                        onClick={() => setActiveTab('seller')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                            activeTab === 'seller'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Mes ventes
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Aucune commande
                        </h2>
                        <p className="text-gray-500 mb-6">
                            {activeTab === 'buyer'
                                ? "Vous n'avez pas encore passe de commande."
                                : "Vous n'avez pas encore recu de commande."}
                        </p>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            Voir les produits
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const status = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = status.icon;

                            return (
                                <div
                                    key={order.id}
                                    className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
                                >
                                    {/* Order Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                                <StatusIcon className="h-4 w-4" />
                                                {status.label}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {formatDate(order.created_at)}
                                        </span>
                                    </div>

                                    {/* Order Items Preview */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex -space-x-2">
                                            {(order.items || []).slice(0, 3).map((item, index) => (
                                                <div
                                                    key={(item as any).image_url}
                                                    className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-white overflow-hidden"
                                                >
                                                    {(item as any).image_url ? (
                                                        <img
                                                            src={(item as any).image_url}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(order.items?.length || 0) > 3 && (
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-white flex items-center justify-center text-sm font-medium text-gray-500">
                                                    +{(order.items?.length || 0) - 3}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm text-gray-600">
                                                {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-gray-900">
                                                {formatPrice(order.total_amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div className="flex gap-2">
                                            {activeTab === 'buyer' && ['pending', 'confirmed'].includes(order.status) && (
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            )}
                                        </div>
                                        <Link
                                            href={`/orders/${order.id}`}
                                            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium"
                                        >
                                            Voir les details
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

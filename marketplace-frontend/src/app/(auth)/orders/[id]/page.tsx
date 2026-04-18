'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package,
    Loader2,
    ArrowLeft,
    Clock,
    CheckCircle,
    Truck,
    XCircle,
    AlertCircle,
    MapPin,
    Phone,
    Mail,
    CreditCard
} from 'lucide-react';
import { Order } from '@/lib/api';
import { useOrder, useCancelOrder } from '@/hooks/useOrders';
import { useCanReview, useCreateReview } from '@/hooks/useReviews';
import { ReviewForm } from '@/components/ReviewForm';

const statusConfig: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
    pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
    confirmed: { label: 'Confirmee', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle },
    shipped: { label: 'Expediee', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Truck },
    delivered: { label: 'Livree', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
    cancelled: { label: 'Annulee', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
    disputed: { label: 'Litige', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertCircle },
};

const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const { data: order, isLoading: loading } = useOrder(orderId);
    const cancelOrder = useCancelOrder();
    const { data: canReviewData } = useCanReview(order?.seller_organization_id ?? '');
    const createReview = useCreateReview();

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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleCancelOrder = async () => {
        if (!confirm('Voulez-vous vraiment annuler cette commande?')) return;

        try {
            await cancelOrder.mutateAsync(orderId);
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Echec de l\'annulation de la commande');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 pt-24 py-16 text-center">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande non trouvee</h1>
                    <p className="text-gray-500 mb-6">
                        Cette commande n'existe pas ou vous n'avez pas acces.
                    </p>
                    <Link
                        href="/orders"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Voir mes commandes
                    </Link>
                </div>
            </div>
        );
    }

    const status = statusConfig[order.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const currentStepIndex = statusSteps.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 pt-24 py-8">
                {/* Back link */}
                <Link
                    href="/orders"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour aux commandes
                </Link>

                {/* Order Header */}
                <div className="bg-white rounded-lg border p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Commande #{order.id.slice(0, 8)}</p>
                            <h1 className="text-2xl font-bold text-gray-900">Details de la commande</h1>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.bgColor} ${status.color}`}>
                            <StatusIcon className="h-5 w-5" />
                            <span className="font-medium">{status.label}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        Passee le {formatDate(order.created_at)}
                    </p>
                </div>

                {/* Status Timeline */}
                {!isCancelled && (
                    <div className="bg-white rounded-lg border p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Suivi de la commande</h2>
                        <div className="flex items-center justify-between">
                            {statusSteps.map((step, index) => {
                                const stepStatus = statusConfig[step];
                                const StepIcon = stepStatus.icon;
                                const isComplete = currentStepIndex >= index;
                                const isCurrent = currentStepIndex === index;

                                return (
                                    <div key={step} className="flex-1 flex flex-col items-center relative">
                                        {index > 0 && (
                                            <div
                                                className={`absolute left-0 top-5 w-1/2 h-1 -translate-x-1/2 ${
                                                    currentStepIndex >= index ? 'bg-green-500' : 'bg-gray-200'
                                                }`}
                                            />
                                        )}
                                        {index < statusSteps.length - 1 && (
                                            <div
                                                className={`absolute right-0 top-5 w-1/2 h-1 translate-x-1/2 ${
                                                    currentStepIndex > index ? 'bg-green-500' : 'bg-gray-200'
                                                }`}
                                            />
                                        )}
                                        <div
                                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                                                isComplete
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-400'
                                            } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                                        >
                                            <StepIcon className="h-5 w-5" />
                                        </div>
                                        <span
                                            className={`mt-2 text-sm ${
                                                isComplete ? 'text-green-600 font-medium' : 'text-gray-400'
                                            }`}
                                        >
                                            {stepStatus.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Items */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles commandes</h2>
                        <div className="space-y-4">
                            {order.items?.map((item, index) => (
                                <div key={(item as any).title} className="flex gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {(item as any).image_url ? (
                                            <img
                                                src={(item as any).image_url}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-gray-900">{item.title}</p>
                                        <p className="text-sm text-gray-500">
                                            {item.quantity} x {formatPrice(item.unit_price)}
                                            {item.unit && ` / ${item.unit}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            {formatPrice(item.quantity * item.unit_price)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <hr className="my-4" />

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Sous-total</span>
                                <span className="text-gray-900">{formatPrice(order.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Livraison</span>
                                <span className="text-gray-900">A determiner</span>
                            </div>
                            <hr />
                            <div className="flex justify-between font-semibold">
                                <span className="text-gray-900">Total</span>
                                <span className="text-green-600 text-xl">{formatPrice(order.total_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Shipping & Payment Info */}
                    <div className="space-y-6">
                        {/* Shipping Address */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-green-600" />
                                Adresse de livraison
                            </h2>
                            <div className="text-gray-600 space-y-1">
                                <p className="font-medium text-gray-900">{order.shipping_details?.name}</p>
                                <p>{order.shipping_details?.address}</p>
                                <p>{order.shipping_details?.city} {order.shipping_details?.postal_code}</p>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span>{order.shipping_details?.phone}</span>
                                </div>
                                {order.shipping_details?.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span>{order.shipping_details.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-green-600" />
                                Paiement
                            </h2>
                            <div className="text-gray-600">
                                <p className="font-medium text-gray-900">
                                    {order.payment_method === 'cod' ? 'Paiement a la livraison' : 'Paiement en ligne'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Statut: {order.payment_status === 'pending' ? 'En attente' : order.payment_status}
                                </p>
                            </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
                                <p className="text-gray-600">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {['pending', 'confirmed'].includes(order.status) && (
                    <div className="mt-6 bg-white rounded-lg border p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Actions</p>
                                <p className="text-sm text-gray-500">
                                    Vous pouvez annuler cette commande tant qu'elle n'est pas expediee.
                                </p>
                            </div>
                            <button
                                onClick={handleCancelOrder}
                                className="px-6 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Annuler la commande
                            </button>
                        </div>
                    </div>
                )}

                {order.status === 'delivered' && canReviewData?.canReview && (
                    <div className="mt-8">
                        <ReviewForm
                            sellerName={(order as any).seller?.name || 'le vendeur'}
                            onSubmit={async (data) => {
                                await createReview.mutateAsync({
                                    seller_organization_id: order.seller_organization_id,
                                    order_id: order.id,
                                    ...data,
                                });
                            }}
                            isSubmitting={createReview.isPending}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

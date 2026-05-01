'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    MapPin,
    CreditCard,
    Truck,
    Check,
    Loader2,
    ShoppingCart,
    Leaf,
    AlertCircle
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { ApiClient } from '@/lib/api';

interface ShippingDetails {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    postal_code: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, loading: cartLoading, total, clearCart } = useCart();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        postal_code: '',
    });

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
    const [notes, setNotes] = useState('');

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(price);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setShippingDetails(prev => ({ ...prev, [name]: value }));
    };

    const validateShipping = () => {
        if (!shippingDetails.name.trim()) return 'Le nom est requis';
        if (!shippingDetails.phone.trim()) return 'Le telephone est requis';
        if (!shippingDetails.address.trim()) return 'L\'adresse est requise';
        if (!shippingDetails.city.trim()) return 'La ville est requise';
        return null;
    };

    const handleNextStep = () => {
        if (step === 1) {
            const validationError = validateShipping();
            if (validationError) {
                setError(validationError);
                return;
            }
            setError(null);
            setStep(2);
        }
    };

    const handleSubmitOrder = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const order = await ApiClient.createOrder({
                shipping_details: shippingDetails,
                payment_method: paymentMethod,
                notes: notes || undefined,
            });

            // Redirect to confirmation page
            const orderId = Array.isArray(order) ? order[0].id : order.id;
            router.push(`/checkout/confirmation?orderId=${orderId}`);
        } catch (err: any) {
            console.error('Failed to create order:', err);
            setError('Echec de la creation de la commande. Veuillez reessayer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cartLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Votre panier est vide</h1>
                    <p className="text-gray-500 mb-6">
                        Ajoutez des produits a votre panier pour passer commande.
                    </p>
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Voir les produits
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <nav className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">AgroGina</span>
                        </Link>
                        <Link
                            href="/cart"
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Retour au panier
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Finaliser la commande</h1>

                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {step > 1 ? <Check className="h-5 w-5" /> : '1'}
                        </div>
                        <span className={`ml-2 ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>Livraison</span>
                    </div>
                    <div className="w-16 h-1 mx-4 bg-gray-200">
                        <div className={`h-full ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    </div>
                    <div className="flex items-center">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {step > 2 ? <Check className="h-5 w-5" /> : '2'}
                        </div>
                        <span className={`ml-2 ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>Confirmation</span>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {step === 1 && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-green-600" />
                                    Adresse de livraison
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="shipping-name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Nom complet *
                                            </label>
                                            <input
                                                id="shipping-name"
                                                type="text"
                                                name="name"
                                                value={shippingDetails.name}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                placeholder="Votre nom"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="shipping-phone" className="block text-sm font-medium text-gray-700 mb-1">
                                                Telephone *
                                            </label>
                                            <input
                                                id="shipping-phone"
                                                type="tel"
                                                name="phone"
                                                value={shippingDetails.phone}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                placeholder="+212 6XX XXX XXX"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="shipping-email" className="block text-sm font-medium text-gray-700 mb-1">
                                            Email (optionnel)
                                        </label>
                                        <input
                                            id="shipping-email"
                                            type="email"
                                            name="email"
                                            value={shippingDetails.email}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="votre@email.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="shipping-address" className="block text-sm font-medium text-gray-700 mb-1">
                                            Adresse *
                                        </label>
                                        <input
                                            id="shipping-address"
                                            type="text"
                                            name="address"
                                            value={shippingDetails.address}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="Rue, numero, quartier..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="shipping-city" className="block text-sm font-medium text-gray-700 mb-1">
                                                Ville *
                                            </label>
                                            <input
                                                id="shipping-city"
                                                type="text"
                                                name="city"
                                                value={shippingDetails.city}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                placeholder="Casablanca"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="shipping-postal-code" className="block text-sm font-medium text-gray-700 mb-1">
                                                Code postal
                                            </label>
                                            <input
                                                id="shipping-postal-code"
                                                type="text"
                                                name="postal_code"
                                                value={shippingDetails.postal_code}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                placeholder="20000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="mt-6 w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Continuer
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                {/* Shipping Summary */}
                                <div className="bg-white rounded-lg border p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <Truck className="h-5 w-5 text-green-600" />
                                            Livraison
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="text-sm text-green-600 hover:text-green-700"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                    <div className="text-gray-600">
                                        <p className="font-medium text-gray-900">{shippingDetails.name}</p>
                                        <p>{shippingDetails.address}</p>
                                        <p>{shippingDetails.city} {shippingDetails.postal_code}</p>
                                        <p>{shippingDetails.phone}</p>
                                        {shippingDetails.email && <p>{shippingDetails.email}</p>}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="bg-white rounded-lg border p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-green-600" />
                                        Mode de paiement
                                    </h2>

                                    <div className="space-y-3">
                                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="radio"
                                                name="payment"
                                                value="cod"
                                                checked={paymentMethod === 'cod'}
                                                onChange={() => setPaymentMethod('cod')}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-green-500' : 'border-gray-300'}`}>
                                                {paymentMethod === 'cod' && <div className="w-3 h-3 rounded-full bg-green-500"></div>}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Paiement a la livraison</p>
                                                <p className="text-sm text-gray-500">Payez en especes lors de la reception</p>
                                            </div>
                                        </label>

                                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${paymentMethod === 'online' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'} opacity-50 cursor-not-allowed`}>
                                            <input
                                                type="radio"
                                                name="payment"
                                                value="online"
                                                checked={paymentMethod === 'online'}
                                                onChange={() => {}}
                                                disabled
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${paymentMethod === 'online' ? 'border-green-500' : 'border-gray-300'}`}>
                                                {paymentMethod === 'online' && <div className="w-3 h-3 rounded-full bg-green-500"></div>}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Paiement en ligne</p>
                                                <p className="text-sm text-gray-500">Bientot disponible</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="bg-white rounded-lg border p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Notes (optionnel)
                                    </h2>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        rows={3}
                                        placeholder="Instructions speciales pour la livraison..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSubmitOrder}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Traitement en cours...
                                        </>
                                    ) : (
                                        <>
                                            Confirmer la commande - {formatPrice(total)}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border p-6 sticky top-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Votre commande</h2>

                            <div className="space-y-4 mb-6">
                                {cart.items.map((item) => (
                                    <div key={item.id} className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                                            <p className="text-sm text-gray-500">
                                                {item.quantity} x {formatPrice(item.unit_price)}
                                            </p>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatPrice(item.quantity * item.unit_price)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr className="mb-4" />

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Sous-total</span>
                                    <span className="text-gray-900">{formatPrice(total)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Livraison</span>
                                    <span className="text-gray-900">A determiner</span>
                                </div>
                                <hr />
                                <div className="flex justify-between font-semibold">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-green-600 text-xl">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

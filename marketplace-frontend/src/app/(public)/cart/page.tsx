'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Trash2, ShoppingCart, LogIn } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/components/CartItem';

export default function CartPage() {
    const router = useRouter();
    const { cart, loading, error, clearCart, itemCount, total } = useCart();
    const [isClearing, setIsClearing] = useState(false);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(price);
    };

    const handleClearCart = async () => {
        if (!confirm('Voulez-vous vraiment vider votre panier?')) return;

        setIsClearing(true);
        try {
            await clearCart();
        } catch (error) {
            console.error('Failed to clear cart:', error);
        } finally {
            setIsClearing(false);
        }
    };

    const handleCheckout = () => {
        router.push('/checkout');
    };

    // Check if user is logged in
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('auth_token');

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <LogIn className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connectez-vous pour voir votre panier</h1>
                        <p className="text-gray-500 mb-6">
                            Vous devez vous connecter pour ajouter des produits au panier et passer commande.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="/login"
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Se connecter
                            </Link>
                            <Link
                                href="/signup"
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Creer un compte
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty cart
    if (!cart || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Votre panier est vide</h1>
                        <p className="text-gray-500 mb-6">
                            Parcourez nos produits et ajoutez-les a votre panier.
                        </p>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            Voir les produits
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/products"
                            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Mon Panier ({itemCount} {itemCount === 1 ? 'article' : 'articles'})
                        </h1>
                    </div>
                    <button
                        onClick={handleClearCart}
                        disabled={isClearing}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Vider le panier
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.items.map((item) => (
                            <CartItem key={item.id} item={item} />
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border p-6 sticky top-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume de la commande</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Sous-total</span>
                                    <span className="text-gray-900">{formatPrice(total)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Livraison</span>
                                    <span className="text-gray-900">Calcule a la prochaine etape</span>
                                </div>
                                <hr />
                                <div className="flex justify-between font-semibold">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-green-600 text-xl">{formatPrice(total)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout}
                                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Passer la commande
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                Paiement securise. Livraison dans tout le Maroc.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

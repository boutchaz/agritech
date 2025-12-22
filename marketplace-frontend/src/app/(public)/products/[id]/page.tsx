'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { CartIcon } from '@/components/CartIcon';
import {
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    Leaf,
    Loader2,
    MapPin,
    Package,
    ShoppingBag,
    ShoppingCart,
    Calendar,
    User,
    Phone,
    Mail,
    Share2,
    Heart,
    Check,
    X,
    Menu,
    Minus,
    Plus
} from 'lucide-react';

interface Product {
    id: string;
    title: string;
    description?: string;
    short_description?: string;
    price: number;
    currency: string;
    images: string[];
    unit?: string;
    location_address?: string;
    created_at?: string;
    updated_at?: string;
    category_name?: string;
    item_code?: string;
    crop_type?: string;
    variety?: string;
    quantity_available?: number;
    organization_id?: string;
    source?: string;
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        async function fetchProduct() {
            if (!productId) return;

            try {
                setLoading(true);
                setError(null);
                const data = await ApiClient.getProduct(productId);
                setProduct(data);
            } catch (err) {
                console.error('Failed to fetch product', err);
                setError('Produit non trouvé');
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [productId]);

    const handleAddToCart = async () => {
        if (!product || addingToCart) return;

        // Check if user is logged in
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            router.push('/login?redirect=' + encodeURIComponent(`/products/${productId}`));
            return;
        }

        setAddingToCart(true);
        try {
            const source = product.source === 'marketplace_listing' ? 'listing' : 'item';
            await addToCart(product.id, quantity, source);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 3000);
        } catch (error) {
            console.error('Failed to add to cart:', error);
        } finally {
            setAddingToCart(false);
        }
    };

    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: currency || 'MAD',
        }).format(price);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-600">Chargement du produit...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Leaf className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">AgriTech</span>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Market</span>
                            </Link>
                        </div>
                    </div>
                </nav>

                <div className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                        <div className="text-6xl mb-4">404</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit non trouvé</h1>
                        <p className="text-gray-600 mb-6">
                            Le produit que vous recherchez n'existe pas ou a été supprimé.
                        </p>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour aux produits
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const images = product.images && product.images.length > 0 ? product.images : [];
    const currentImage = images[selectedImageIndex];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">AgriTech</span>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Market</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/products" className="text-gray-600 hover:text-gray-900 transition">
                                Produits
                            </Link>
                            <Link href="/categories" className="text-gray-600 hover:text-gray-900 transition">
                                Catégories
                            </Link>
                            <Link href="https://agritech-dashboard.thebzlab.online" className="text-gray-600 hover:text-gray-900 transition">
                                Dashboard
                            </Link>
                        </div>

                        {/* Cart & Auth Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <CartIcon />
                            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                                Connexion
                            </Link>
                            <Link
                                href="/signup"
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center gap-2"
                            >
                                Commencer
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-600"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 py-4">
                        <div className="max-w-7xl mx-auto px-4 space-y-4">
                            <Link href="/products" className="block text-gray-600 hover:text-gray-900">
                                Produits
                            </Link>
                            <Link href="/categories" className="block text-gray-600 hover:text-gray-900">
                                Catégories
                            </Link>
                            <Link href="https://agritech-dashboard.thebzlab.online" className="block text-gray-600 hover:text-gray-900">
                                Dashboard
                            </Link>
                            <hr className="border-gray-100" />
                            <Link href="/login" className="block text-gray-600 hover:text-gray-900">
                                Connexion
                            </Link>
                            <Link
                                href="/signup"
                                className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                            >
                                Commencer
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-emerald-600 transition">Accueil</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/products" className="hover:text-emerald-600 transition">Produits</Link>
                    {product.category_name && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="hover:text-emerald-600 transition">{product.category_name}</span>
                        </>
                    )}
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</span>
                </nav>

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        <div className="aspect-square bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                            {currentImage ? (
                                <img
                                    src={currentImage}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                    <ShoppingBag className="h-24 w-24 mb-4" />
                                    <span className="text-lg">Aucune image</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {images.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                                            selectedImageIndex === index
                                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`${product.title} - Image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        {/* Title & Category */}
                        <div>
                            {product.category_name && (
                                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full mb-3">
                                    {product.category_name}
                                </span>
                            )}
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                {product.title}
                            </h1>
                            {product.item_code && (
                                <p className="text-sm text-gray-500">Réf: {product.item_code}</p>
                            )}
                        </div>

                        {/* Price */}
                        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-emerald-700">
                                    {formatPrice(product.price, product.currency)}
                                </span>
                                {product.unit && (
                                    <span className="text-lg text-emerald-600">/ {product.unit}</span>
                                )}
                            </div>
                            {product.quantity_available !== null && product.quantity_available !== undefined && (
                                <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                                    <Package className="w-4 h-4" />
                                    {product.quantity_available} {product.unit || 'unités'} disponibles
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        {(product.description || product.short_description) && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {product.description || product.short_description}
                                </p>
                            </div>
                        )}

                        {/* Product Details */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Détails du produit</h2>

                            <div className="grid grid-cols-2 gap-4">
                                {product.crop_type && (
                                    <div>
                                        <span className="text-sm text-gray-500">Type de culture</span>
                                        <p className="font-medium text-gray-900">{product.crop_type}</p>
                                    </div>
                                )}
                                {product.variety && (
                                    <div>
                                        <span className="text-sm text-gray-500">Variété</span>
                                        <p className="font-medium text-gray-900">{product.variety}</p>
                                    </div>
                                )}
                                {product.unit && (
                                    <div>
                                        <span className="text-sm text-gray-500">Unité de vente</span>
                                        <p className="font-medium text-gray-900">{product.unit}</p>
                                    </div>
                                )}
                                {product.created_at && (
                                    <div>
                                        <span className="text-sm text-gray-500">Publié le</span>
                                        <p className="font-medium text-gray-900">{formatDate(product.created_at)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        {product.location_address && (
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <span className="text-sm text-gray-500">Localisation</span>
                                    <p className="font-medium text-gray-900">{product.location_address}</p>
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-4 pt-4">
                            <span className="text-gray-700 font-medium">Quantite:</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {product.unit && (
                                <span className="text-gray-500">{product.unit}</span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={handleAddToCart}
                                disabled={addingToCart}
                                className={`flex-1 px-6 py-4 rounded-xl transition font-medium text-lg flex items-center justify-center gap-2 ${
                                    addedToCart
                                        ? 'bg-green-600 text-white'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                } disabled:opacity-50`}
                            >
                                {addingToCart ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : addedToCart ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Ajoute au panier!
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="w-5 h-5" />
                                        Ajouter au panier
                                    </>
                                )}
                            </button>
                            <button className="px-6 py-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2">
                                <Heart className="w-5 h-5" />
                                Favoris
                            </button>
                            <button className="px-6 py-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-gray-400 py-16 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Leaf className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">AgriTech</span>
                            </div>
                            <p className="text-sm">
                                La plateforme complète pour moderniser votre agriculture.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Produit</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="/products" className="hover:text-white transition">Tous les produits</Link></li>
                                <li><Link href="/categories" className="hover:text-white transition">Catégories</Link></li>
                                <li><Link href="/signup" className="hover:text-white transition">Devenir vendeur</Link></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Support</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
                                <li><Link href="#" className="hover:text-white transition">FAQ</Link></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Légal</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="hover:text-white transition">Confidentialité</Link></li>
                                <li><Link href="#" className="hover:text-white transition">CGU</Link></li>
                                <li><Link href="#" className="hover:text-white transition">Mentions légales</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
                        © 2025 AgriTech. Tous droits réservés.
                    </div>
                </div>
            </footer>
        </div>
    );
}

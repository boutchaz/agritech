'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    MapPin,
    Star,
    Package,
    Phone,
    Mail,
    Globe,
    Calendar,
    Loader2,
    Building2,
    ShoppingBag,
    BadgeCheck,
    ChevronRight,
    Leaf,
    MessageCircle
} from 'lucide-react';
import { ApiClient, Seller, SellerReview } from '@/lib/api';
import { CartIcon } from '@/components/CartIcon';
import { ProductCard } from '@/components/ProductCard';

export default function SellerProfilePage() {
    const params = useParams();
    const slug = params.slug as string;

    const [seller, setSeller] = useState<Seller | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [reviews, setReviews] = useState<SellerReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
    const [productsTotal, setProductsTotal] = useState(0);
    const [reviewsTotal, setReviewsTotal] = useState(0);

    useEffect(() => {
        fetchSellerData();
    }, [slug]);

    const fetchSellerData = async () => {
        try {
            setLoading(true);
            const [sellerData, productsData, reviewsData] = await Promise.all([
                ApiClient.getSeller(slug),
                ApiClient.getSellerProducts(slug),
                ApiClient.getSellerReviews(slug),
            ]);
            setSeller(sellerData);
            setProducts(productsData.products);
            setProductsTotal(productsData.total);
            setReviews(reviewsData.reviews);
            setReviewsTotal(reviewsData.total);
        } catch (error) {
            console.error('Failed to fetch seller data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
        });
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-gray-50">
                <nav className="bg-white border-b">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">AgriTech</span>
                        </Link>
                    </div>
                </nav>
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Partenaire non trouve</h1>
                    <p className="text-gray-500 mb-6">
                        Ce partenaire n'existe pas ou n'est plus disponible.
                    </p>
                    <Link
                        href="/sellers"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voir tous les partenaires
                    </Link>
                </div>
            </div>
        );
    }

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

                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/products" className="text-gray-600 hover:text-gray-900 transition">
                                Produits
                            </Link>
                            <Link href="/sellers" className="text-emerald-600 font-medium">
                                Partenaires
                            </Link>
                            <Link href="/categories" className="text-gray-600 hover:text-gray-900 transition">
                                Categories
                            </Link>
                        </div>

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
                    </div>
                </div>
            </nav>

            <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-emerald-600 transition">Accueil</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/sellers" className="hover:text-emerald-600 transition">Partenaires</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-gray-900 font-medium">{seller.name}</span>
                </nav>

                {/* Seller Header */}
                <div className="bg-white rounded-2xl border overflow-hidden mb-8">
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>

                    <div className="px-6 pb-6">
                        {/* Logo & Basic Info */}
                        <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
                            <div className="w-24 h-24 bg-white rounded-xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                                {seller.logo_url ? (
                                    <img
                                        src={seller.logo_url}
                                        alt={seller.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="h-12 w-12 text-emerald-600" />
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                                    {seller.is_verified && (
                                        <BadgeCheck className="h-6 w-6 text-blue-500" />
                                    )}
                                </div>
                                {seller.city && (
                                    <p className="text-gray-500 flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {seller.address ? `${seller.address}, ` : ''}{seller.city}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {seller.phone && (
                                    <a
                                        href={`tel:${seller.phone}`}
                                        className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center gap-2"
                                    >
                                        <Phone className="h-4 w-4" />
                                        Appeler
                                    </a>
                                )}
                                {seller.email && (
                                    <a
                                        href={`mailto:${seller.email}`}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Email
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{seller.product_count}</p>
                                <p className="text-sm text-gray-500">Produits</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                    <span className="text-2xl font-bold text-gray-900">
                                        {seller.average_rating?.toFixed(1) || '-'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">Note moyenne</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{seller.review_count}</p>
                                <p className="text-sm text-gray-500">Avis</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatDate(seller.created_at)}
                                </p>
                                <p className="text-sm text-gray-500">Membre depuis</p>
                            </div>
                        </div>

                        {/* Description */}
                        {seller.description && (
                            <div className="mt-6 pt-6 border-t">
                                <h2 className="font-semibold text-gray-900 mb-2">A propos</h2>
                                <p className="text-gray-600">{seller.description}</p>
                            </div>
                        )}

                        {/* Contact Info */}
                        <div className="mt-6 pt-6 border-t flex flex-wrap gap-6">
                            {seller.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-4 w-4" />
                                    <span>{seller.phone}</span>
                                </div>
                            )}
                            {seller.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-4 w-4" />
                                    <span>{seller.email}</span>
                                </div>
                            )}
                            {seller.website && (
                                <a
                                    href={seller.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                                >
                                    <Globe className="h-4 w-4" />
                                    <span>Visiter le site web</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
                            activeTab === 'products'
                                ? 'text-emerald-600 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Package className="h-4 w-4" />
                        Produits ({productsTotal})
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
                            activeTab === 'reviews'
                                ? 'text-emerald-600 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <MessageCircle className="h-4 w-4" />
                        Avis ({reviewsTotal})
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'products' && (
                    <div>
                        {products.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border">
                                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Aucun produit disponible</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={{
                                            id: product.id,
                                            title: product.title,
                                            price: product.price,
                                            currency: product.currency || 'MAD',
                                            images: product.images || [],
                                            unit: product.unit,
                                            location_address: product.location_address,
                                            created_at: product.created_at,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div>
                        {reviews.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border">
                                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Aucun avis pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="bg-white rounded-xl border p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                {review.reviewer?.logo_url ? (
                                                    <img
                                                        src={review.reviewer.logo_url}
                                                        alt={review.reviewer.name}
                                                        className="w-full h-full object-cover rounded-full"
                                                    />
                                                ) : (
                                                    <Building2 className="h-6 w-6 text-emerald-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {review.reviewer?.name || 'Acheteur anonyme'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(review.created_at)}
                                                        </p>
                                                    </div>
                                                    {renderStars(review.rating)}
                                                </div>
                                                {review.comment && (
                                                    <p className="text-gray-600">{review.comment}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">AgriTech</span>
                        </div>
                        <p className="text-sm">
                            © 2025 AgriTech. Tous droits reserves.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

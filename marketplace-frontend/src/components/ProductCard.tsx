import Link from 'next/link';
import { ShoppingBag, MapPin, Calendar, Building2 } from 'lucide-react';

interface Seller {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string;
    city?: string;
}

interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    unit?: string;
    location_address?: string;
    created_at?: string;
    seller?: Seller;
}

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: currency || 'MAD',
        }).format(price);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            month: 'short',
            day: 'numeric'
        });
    };

    const imageUrl = product.images && product.images.length > 0
        ? product.images[0]
        : null;

    return (
        <Link
            href={`/products/${product.id}`}
            className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden"
        >
            {/* Image */}
            <div className="aspect-square bg-gray-100 relative flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300">
                        <ShoppingBag className="h-16 w-16 mb-2" />
                        <span className="text-sm">Pas d'image</span>
                    </div>
                )}
                {/* Badge */}
                {product.created_at && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        Nouveau
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 mb-2 line-clamp-2">
                    {product.title}
                </h3>

                {/* Seller Tag */}
                {product.seller && (
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            {product.seller.logo_url ? (
                                <img
                                    src={product.seller.logo_url}
                                    alt={product.seller.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 className="h-3 w-3 text-emerald-600" />
                            )}
                        </div>
                        <span className="text-xs text-gray-600 truncate">{product.seller.name}</span>
                    </div>
                )}

                {/* Location */}
                {(product.location_address || product.seller?.city) && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1 shrink-0" />
                        <span className="truncate">{product.location_address || product.seller?.city}</span>
                    </div>
                )}

                {/* Date */}
                {product.created_at && (
                    <div className="flex items-center text-xs text-gray-400 mb-3">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Publie le {formatDate(product.created_at)}</span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                        <span className="text-2xl font-bold text-green-700">
                            {formatPrice(product.price, product.currency)}
                        </span>
                        {product.unit && (
                            <span className="text-sm text-gray-500 ml-1">/ {product.unit}</span>
                        )}
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition opacity-0 group-hover:opacity-100">
                        Voir
                    </button>
                </div>
            </div>
        </Link>
    );
}

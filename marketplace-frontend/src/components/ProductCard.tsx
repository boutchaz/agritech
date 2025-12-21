import Link from 'next/link';
import { ShoppingBag, MapPin, Calendar } from 'lucide-react';

interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    unit?: string;
    location_address?: string;
    created_at?: string;
}

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(price);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
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
                        <span className="text-sm">No image</span>
                    </div>
                )}
                {/* Badge */}
                {product.created_at && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        New
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 mb-2 line-clamp-2">
                    {product.title}
                </h3>

                {/* Location */}
                {product.location_address && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="truncate">{product.location_address}</span>
                    </div>
                )}

                {/* Date */}
                {product.created_at && (
                    <div className="flex items-center text-xs text-gray-400 mb-3">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Listed {formatDate(product.created_at)}</span>
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
                        View
                    </button>
                </div>
            </div>
        </Link>
    );
}

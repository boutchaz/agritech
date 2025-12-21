import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    unit?: string;
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

    const imageUrl = product.images && product.images.length > 0
        ? product.images[0]
        : null;

    return (
        <Link href={`/products/${product.id}`} className="group block overflow-hidden rounded-lg border bg-white hover:border-green-500 hover:shadow-md transition-all">
            <div className="aspect-square bg-gray-100 relative items-center justify-center flex overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <ShoppingBag className="h-12 w-12 text-gray-300" />
                )}
            </div>
            <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 truncate">{product.title}</h3>
                <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-lg text-green-700">
                        {formatPrice(product.price, product.currency)}
                    </span>
                    {product.unit && (
                        <span className="text-xs text-gray-500">per {product.unit}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

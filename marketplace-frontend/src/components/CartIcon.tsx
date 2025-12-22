'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export function CartIcon() {
    const { itemCount, loading } = useCart();

    return (
        <Link
            href="/cart"
            className="relative inline-flex items-center p-2 text-gray-700 hover:text-green-600 transition-colors"
            aria-label={`Shopping cart with ${itemCount} items`}
        >
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-green-600 rounded-full">
                    {itemCount > 99 ? '99+' : itemCount}
                </span>
            )}
        </Link>
    );
}

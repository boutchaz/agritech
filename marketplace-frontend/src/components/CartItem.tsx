'use client';

import { useState } from 'react';
import { Trash2, Minus, Plus, Package } from 'lucide-react';
import { CartItem as CartItemType } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';

interface CartItemProps {
    item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
    const { updateQuantity, removeItem, loading } = useCart();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleQuantityChange = async (newQuantity: number) => {
        if (newQuantity < 1 || isUpdating) return;

        setIsUpdating(true);
        try {
            await updateQuantity(item.id, newQuantity);
        } catch (error) {
            console.error('Failed to update quantity:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemove = async () => {
        if (isUpdating) return;

        setIsUpdating(true);
        try {
            await removeItem(item.id);
        } catch (error) {
            console.error('Failed to remove item:', error);
            setIsUpdating(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(price);
    };

    const subtotal = item.quantity * item.unit_price;

    return (
        <div className={`flex items-center gap-4 p-4 bg-white rounded-lg border ${isUpdating ? 'opacity-50' : ''}`}>
            {/* Image */}
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="h-8 w-8" />
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex-grow min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                <p className="text-sm text-gray-500">
                    {formatPrice(item.unit_price)}
                    {item.unit && <span> / {item.unit}</span>}
                </p>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleQuantityChange(item.quantity - 1)}
                    disabled={item.quantity <= 1 || isUpdating}
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                >
                    <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <button
                    onClick={() => handleQuantityChange(item.quantity + 1)}
                    disabled={isUpdating}
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {/* Subtotal */}
            <div className="w-28 text-right">
                <p className="font-semibold text-gray-900">{formatPrice(subtotal)}</p>
            </div>

            {/* Remove Button */}
            <button
                onClick={handleRemove}
                disabled={isUpdating}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label="Remove item"
            >
                <Trash2 className="h-5 w-5" />
            </button>
        </div>
    );
}

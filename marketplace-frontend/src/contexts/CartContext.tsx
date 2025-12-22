'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient, Cart, CartItem } from '@/lib/api';

interface CartContextType {
    cart: Cart | null;
    loading: boolean;
    error: string | null;
    addToCart: (productId: string, quantity: number, source: 'listing' | 'item') => Promise<void>;
    updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
    removeItem: (cartItemId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
    itemCount: number;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshCart = useCallback(async () => {
        // Check if user is authenticated
        if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
            setCart(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await ApiClient.getCart();
            setCart(data);
            setError(null);
        } catch (err: any) {
            // Don't show error for unauthenticated users
            if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                setCart(null);
            } else {
                setError('Failed to load cart');
                console.error('Cart fetch error:', err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    const addToCart = async (productId: string, quantity: number, source: 'listing' | 'item') => {
        try {
            setLoading(true);
            const data = source === 'listing'
                ? await ApiClient.addToCart({ listing_id: productId, quantity })
                : await ApiClient.addToCart({ item_id: productId, quantity });
            setCart(data);
            setError(null);
        } catch (err: any) {
            setError('Failed to add to cart');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (cartItemId: string, quantity: number) => {
        try {
            setLoading(true);
            const data = await ApiClient.updateCartItem(cartItemId, quantity);
            setCart(data);
            setError(null);
        } catch (err: any) {
            setError('Failed to update quantity');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (cartItemId: string) => {
        try {
            setLoading(true);
            const data = await ApiClient.removeFromCart(cartItemId);
            setCart(data);
            setError(null);
        } catch (err: any) {
            setError('Failed to remove item');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        try {
            setLoading(true);
            await ApiClient.clearCart();
            setCart(null);
            setError(null);
        } catch (err: any) {
            setError('Failed to clear cart');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const itemCount = cart?.item_count || 0;
    const total = cart?.total || 0;

    return (
        <CartContext.Provider
            value={{
                cart,
                loading,
                error,
                addToCart,
                updateQuantity,
                removeItem,
                clearCart,
                refreshCart,
                itemCount,
                total,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

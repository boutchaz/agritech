'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProducts() {
            try {
                setLoading(true);
                const data = await ApiClient.getProducts();
                setProducts(data);
            } catch (err) {
                console.error('Failed to fetch products', err);
                setError('Failed to load products');
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="text-2xl">🌱</span>
                            <span className="text-xl font-bold text-green-700">AgriTech Market</span>
                        </Link>
                        <nav className="hidden md:flex space-x-6">
                            <Link href="/products" className="text-green-700 font-semibold">Products</Link>
                            <Link href="/categories" className="text-gray-700 hover:text-green-700">Categories</Link>
                            <Link href="/dashboard" className="text-gray-700 hover:text-green-700">Dashboard</Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">All Products</h1>
                    <p className="text-gray-600">{products.length} products available</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-gray-800">Filters</h2>
                                <SlidersHorizontal className="h-5 w-5 text-gray-500" />
                            </div>

                            {/* Search */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-800 mb-3">Categories</h3>
                                <div className="space-y-2">
                                    {['All', 'Crops', 'Machinery', 'Inputs', 'Livestock'].map((cat) => (
                                        <label key={cat} className="flex items-center">
                                            <input type="checkbox" className="rounded text-green-600 mr-2" />
                                            <span className="text-sm text-gray-700">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-800 mb-3">Price Range</h3>
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100000"
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>0 MAD</span>
                                        <span>100,000 MAD</span>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <h3 className="font-medium text-gray-800 mb-3">Location</h3>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                    <option>All Regions</option>
                                    <option>Casablanca-Settat</option>
                                    <option>Rabat-Salé-Kénitra</option>
                                    <option>Marrakech-Safi</option>
                                    <option>Fès-Meknès</option>
                                    <option>Tanger-Tétouan-Al Hoceïma</option>
                                </select>
                            </div>
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <main className="flex-1">
                        {/* Sort Bar */}
                        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                Showing {products.length} results
                            </span>
                            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option>Sort by: Latest</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                                <option>Most Popular</option>
                            </select>
                        </div>

                        {/* Products Grid */}
                        {loading ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                                <p className="text-gray-600">Loading products...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <div className="text-6xl mb-4">⚠️</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Error loading products
                                </h3>
                                <p className="text-gray-600 mb-6">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    No products found
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Try adjusting your filters or check back later
                                </p>
                                <Link
                                    href="/dashboard"
                                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    List Your Products
                                </Link>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

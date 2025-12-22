'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api';
import { CategoryCard, Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Loader2, Grid3X3, ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCategories() {
            try {
                setLoading(true);
                const response = await ApiClient.getCategories();
                // Handle Strapi response format
                setCategories(response.data || response || []);
            } catch (err) {
                console.error('Failed to fetch categories', err);
                setError('Failed to load categories');
            } finally {
                setLoading(false);
            }
        }
        fetchCategories();
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
                            <Link href="/products" className="text-gray-700 hover:text-green-700">Products</Link>
                            <Link href="/categories" className="text-green-700 font-semibold">Categories</Link>
                            <Link href="/dashboard" className="text-gray-700 hover:text-green-700">Dashboard</Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-green-700">Home</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-gray-900">Categories</span>
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Grid3X3 className="h-8 w-8 text-green-600" />
                        <h1 className="text-3xl font-bold text-gray-800">Browse by Category</h1>
                    </div>
                    <p className="text-gray-600">
                        Explore our agricultural marketplace by category. Find crops, machinery, supplies, and more.
                    </p>
                </div>

                {/* Categories Grid */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading categories...</p>
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Error loading categories
                        </h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            Try Again
                        </button>
                    </div>
                ) : categories.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {categories.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">📂</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            No categories yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Categories will appear here once they are set up.
                        </p>
                        <Link
                            href="/products"
                            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            Browse All Products
                        </Link>
                    </div>
                )}

                {/* Quick Stats */}
                {categories.length > 0 && (
                    <div className="mt-12 bg-green-50 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-green-800 mb-4">
                            Explore Our Marketplace
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">{categories.length}</div>
                                <div className="text-sm text-gray-600">Categories</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">100+</div>
                                <div className="text-sm text-gray-600">Products</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">50+</div>
                                <div className="text-sm text-gray-600">Sellers</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">12</div>
                                <div className="text-sm text-gray-600">Regions</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

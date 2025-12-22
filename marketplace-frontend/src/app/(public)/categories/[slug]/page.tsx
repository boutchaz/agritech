'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { Loader2, ChevronRight, ArrowLeft, Grid3X3 } from 'lucide-react';

interface Category {
    id: string;
    attributes?: {
        name: string;
        slug: string;
        description?: string;
        icon?: string;
    };
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
}

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [category, setCategory] = useState<Category | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Fetch category details and products in parallel
                const [categoryResponse, productsResponse] = await Promise.all([
                    ApiClient.getCategoryBySlug(slug),
                    ApiClient.getProducts(slug)
                ]);

                setCategory(categoryResponse);
                setProducts(productsResponse || []);
            } catch (err) {
                console.error('Failed to fetch category data', err);
                setError('Failed to load category');
            } finally {
                setLoading(false);
            }
        }

        if (slug) {
            fetchData();
        }
    }, [slug]);

    // Get category attributes
    const categoryName = category?.attributes?.name || category?.name || slug;
    const categoryDescription = category?.attributes?.description || category?.description || '';
    const categoryIcon = category?.attributes?.icon || category?.icon || '';

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
                    <Link href="/categories" className="hover:text-green-700">Categories</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-gray-900">{categoryName}</span>
                </nav>

                {loading ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading category...</p>
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Category not found
                        </h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Link
                            href="/categories"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Categories
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 mb-8 text-white">
                            <div className="flex items-center gap-4 mb-4">
                                {categoryIcon && (
                                    <span className="text-5xl">{categoryIcon}</span>
                                )}
                                <div>
                                    <h1 className="text-3xl font-bold">{categoryName}</h1>
                                    {categoryDescription && (
                                        <p className="mt-2 text-green-100">{categoryDescription}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-green-100">
                                <span>{products.length} products</span>
                                <span>•</span>
                                <Link href="/categories" className="hover:text-white underline">
                                    View all categories
                                </Link>
                            </div>
                        </div>

                        {/* Products Grid */}
                        {products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    No products in this category
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Check back later or browse other categories.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        href="/categories"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                    >
                                        <Grid3X3 className="h-4 w-4" />
                                        Browse Categories
                                    </Link>
                                    <Link
                                        href="/products"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                    >
                                        View All Products
                                    </Link>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

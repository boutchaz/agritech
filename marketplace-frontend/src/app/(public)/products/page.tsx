'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Search, SlidersHorizontal, Loader2, X, ChevronRight } from 'lucide-react';

function ProductsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const categoryParam = searchParams.get('category');

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch categories on mount
    useEffect(() => {
        async function fetchCategories() {
            try {
                const response = await ApiClient.getCategories();
                setCategories(response.data || response || []);
            } catch (err) {
                console.error('Failed to fetch categories', err);
            }
        }
        fetchCategories();
    }, []);

    // Fetch products when category changes
    useEffect(() => {
        async function fetchProducts() {
            try {
                setLoading(true);
                setError(null);
                const data = await ApiClient.getProducts(selectedCategory || undefined);
                setProducts(data || []);
            } catch (err) {
                console.error('Failed to fetch products', err);
                setError('Failed to load products');
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [selectedCategory]);

    // Sync URL with selected category
    useEffect(() => {
        setSelectedCategory(categoryParam);
    }, [categoryParam]);

    const handleCategoryChange = useCallback((slug: string | null) => {
        setSelectedCategory(slug);
        if (slug) {
            router.push(`/products?category=${slug}`);
        } else {
            router.push('/products');
        }
    }, [router]);

    // Get category properties helper
    const getCategoryProps = (category: Category) => ({
        name: category.attributes?.name || category.name || '',
        slug: category.attributes?.slug || category.slug || '',
        icon: category.attributes?.icon || category.icon || ''
    });

    // Get selected category name for display
    const selectedCategoryName = selectedCategory
        ? categories.find(c => (c.attributes?.slug || c.slug) === selectedCategory)
        : null;
    const displayCategoryName = selectedCategoryName
        ? (selectedCategoryName.attributes?.name || selectedCategoryName.name)
        : null;

    // Filter products by search query (client-side)
    const filteredProducts = searchQuery
        ? products.filter(p =>
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : products;

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
                            <Link href="/products" className="text-green-700 font-semibold">Produits</Link>
                            <Link href="/categories" className="text-gray-700 hover:text-green-700">Catégories</Link>
                            <Link href="/dashboard" className="text-gray-700 hover:text-green-700">Dashboard</Link>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-green-700">Accueil</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/products" className="hover:text-green-700">Produits</Link>
                    {displayCategoryName && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-gray-900">{displayCategoryName}</span>
                        </>
                    )}
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {displayCategoryName || 'Tous les Produits'}
                    </h1>
                    <p className="text-gray-600">
                        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-gray-800">Filtres</h2>
                                <SlidersHorizontal className="h-5 w-5 text-gray-500" />
                            </div>

                            {/* Search */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rechercher
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-800 mb-3">Catégories</h3>
                                <div className="space-y-2">
                                    {/* All Products Option */}
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="category"
                                            checked={!selectedCategory}
                                            onChange={() => handleCategoryChange(null)}
                                            className="rounded-full text-green-600 mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Toutes les catégories</span>
                                    </label>

                                    {/* Dynamic Categories */}
                                    {categories.map((category) => {
                                        const { name, slug, icon } = getCategoryProps(category);
                                        return (
                                            <label key={category.id} className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    checked={selectedCategory === slug}
                                                    onChange={() => handleCategoryChange(slug)}
                                                    className="rounded-full text-green-600 mr-2"
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {icon && <span className="mr-1">{icon}</span>}
                                                    {name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {(selectedCategory || searchQuery) && (
                                <button
                                    onClick={() => {
                                        handleCategoryChange(null);
                                        setSearchQuery('');
                                    }}
                                    className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Effacer les filtres
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <main className="flex-1">
                        {/* Active Filters Bar */}
                        {selectedCategory && (
                            <div className="bg-green-50 rounded-lg p-4 mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-green-800">Catégorie:</span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                                        {displayCategoryName}
                                        <button
                                            onClick={() => handleCategoryChange(null)}
                                            className="ml-1 hover:bg-green-700 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                </div>
                                <Link
                                    href="/categories"
                                    className="text-sm text-green-700 hover:text-green-800"
                                >
                                    Voir toutes les catégories
                                </Link>
                            </div>
                        )}

                        {/* Sort Bar */}
                        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                Affichage de {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''}
                            </span>
                            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option>Trier par: Plus récent</option>
                                <option>Prix: Croissant</option>
                                <option>Prix: Décroissant</option>
                                <option>Plus populaire</option>
                            </select>
                        </div>

                        {/* Products Grid */}
                        {loading ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                                <p className="text-gray-600">Chargement des produits...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <div className="text-6xl mb-4">⚠️</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Erreur de chargement
                                </h3>
                                <p className="text-gray-600 mb-6">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Aucun produit trouvé
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {selectedCategory
                                        ? 'Aucun produit dans cette catégorie. Essayez une autre catégorie.'
                                        : 'Revenez plus tard ou ajustez vos filtres.'
                                    }
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    {selectedCategory && (
                                        <button
                                            onClick={() => handleCategoryChange(null)}
                                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                        >
                                            Voir tous les produits
                                        </button>
                                    )}
                                    <Link
                                        href="/dashboard"
                                        className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                    >
                                        Ajouter vos produits
                                    </Link>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function ProductsPageLoading() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Chargement...</p>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsPageLoading />}>
            <ProductsPageContent />
        </Suspense>
    );
}

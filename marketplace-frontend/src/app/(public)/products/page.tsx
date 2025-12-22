'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Search, SlidersHorizontal, Loader2, X, ChevronRight, ArrowRight, Leaf, Menu } from 'lucide-react';

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">AgriTech</span>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Market</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/products" className="text-emerald-600 font-medium">
                                Produits
                            </Link>
                            <Link href="/categories" className="text-gray-600 hover:text-gray-900 transition">
                                Catégories
                            </Link>
                            <Link href="https://agritech-dashboard.thebzlab.online" className="text-gray-600 hover:text-gray-900 transition">
                                Dashboard
                            </Link>
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                                Connexion
                            </Link>
                            <Link
                                href="/signup"
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center gap-2"
                            >
                                Commencer
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-600"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 py-4">
                        <div className="max-w-7xl mx-auto px-4 space-y-4">
                            <Link href="/products" className="block text-emerald-600 font-medium">
                                Produits
                            </Link>
                            <Link href="/categories" className="block text-gray-600 hover:text-gray-900">
                                Catégories
                            </Link>
                            <Link href="https://agritech-dashboard.thebzlab.online" className="block text-gray-600 hover:text-gray-900">
                                Dashboard
                            </Link>
                            <hr className="border-gray-100" />
                            <Link href="/login" className="block text-gray-600 hover:text-gray-900">
                                Connexion
                            </Link>
                            <Link
                                href="/signup"
                                className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                            >
                                Commencer
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                    <Link href="/" className="hover:text-emerald-600 transition">Accueil</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/products" className="hover:text-emerald-600 transition">Produits</Link>
                    {displayCategoryName && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-gray-900 font-medium">{displayCategoryName}</span>
                        </>
                    )}
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {displayCategoryName || 'Tous les Produits'}
                    </h1>
                    <p className="text-gray-600">
                        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        {/* Mobile Filters Toggle */}
                        <button
                            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                            className="lg:hidden w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm mb-4 border border-gray-100"
                        >
                            <span className="font-medium text-gray-800">Filtres</span>
                            <SlidersHorizontal className="h-5 w-5 text-gray-500" />
                        </button>

                        <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block bg-white rounded-xl shadow-sm p-6 sticky top-24 border border-gray-100`}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-gray-900">Filtres</h2>
                                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
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
                                        className="w-full px-3 py-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-900 mb-3">Catégories</h3>
                                <div className="space-y-2">
                                    {/* All Products Option */}
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="category"
                                            checked={!selectedCategory}
                                            onChange={() => handleCategoryChange(null)}
                                            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                        />
                                        <span className="ml-3 text-sm text-gray-700 group-hover:text-emerald-600 transition">
                                            Toutes les catégories
                                        </span>
                                    </label>

                                    {/* Dynamic Categories */}
                                    {categories.map((category) => {
                                        const { name, slug, icon } = getCategoryProps(category);
                                        return (
                                            <label key={category.id} className="flex items-center cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    checked={selectedCategory === slug}
                                                    onChange={() => handleCategoryChange(slug)}
                                                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700 group-hover:text-emerald-600 transition">
                                                    {icon && <span className="mr-1.5">{icon}</span>}
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
                                    className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm font-medium"
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
                            <div className="bg-emerald-50 rounded-xl p-4 mb-6 flex items-center justify-between border border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-emerald-800">Catégorie:</span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full font-medium">
                                        {displayCategoryName}
                                        <button
                                            onClick={() => handleCategoryChange(null)}
                                            className="ml-1 hover:bg-emerald-700 rounded-full p-0.5 transition"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                </div>
                                <Link
                                    href="/categories"
                                    className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                                >
                                    Voir toutes les catégories
                                </Link>
                            </div>
                        )}

                        {/* Sort Bar */}
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between border border-gray-100">
                            <span className="text-sm text-gray-600">
                                Affichage de {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''}
                            </span>
                            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                                <option>Trier par: Plus récent</option>
                                <option>Prix: Croissant</option>
                                <option>Prix: Décroissant</option>
                                <option>Plus populaire</option>
                            </select>
                        </div>

                        {/* Products Grid */}
                        {loading ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                                <p className="text-gray-600">Chargement des produits...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <div className="text-6xl mb-4">⚠️</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Erreur de chargement
                                </h3>
                                <p className="text-gray-600 mb-6">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
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
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
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
                                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                        >
                                            Voir tous les produits
                                        </button>
                                    )}
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                                    >
                                        Ajouter vos produits
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-gray-400 py-16 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Leaf className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">AgriTech</span>
                            </div>
                            <p className="text-sm">
                                La plateforme complète pour moderniser votre agriculture.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Produit</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="/products" className="hover:text-white transition">Tous les produits</Link></li>
                                <li><Link href="/categories" className="hover:text-white transition">Catégories</Link></li>
                                <li><Link href="/signup" className="hover:text-white transition">Devenir vendeur</Link></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Support</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
                                <li><Link href="#" className="hover:text-white transition">FAQ</Link></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-white font-semibold mb-4">Légal</h4>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="hover:text-white transition">Confidentialité</Link></li>
                                <li><Link href="#" className="hover:text-white transition">CGU</Link></li>
                                <li><Link href="#" className="hover:text-white transition">Mentions légales</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
                        © 2025 AgriTech. Tous droits réservés.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function ProductsPageLoading() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
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

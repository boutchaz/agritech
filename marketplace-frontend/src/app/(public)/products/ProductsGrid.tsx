'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategories } from '@/hooks/useCategories';
import { useProductsPaginated } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import { Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Search, SlidersHorizontal, Loader2, X, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';

interface Product {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    description?: string;
    unit?: string;
    location_address?: string;
    created_at?: string;
    seller?: {
        id: string;
        name: string;
        slug?: string;
        logo_url?: string;
        city?: string;
    };
}

interface ProductsGridProps {
    initialProducts: Product[];
    initialCategories: unknown[];
    initialCategory: string | null;
}

function ProductsGridContent({ initialProducts, initialCategories, initialCategory }: ProductsGridProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Read all filter params from URL
    const urlCategory = searchParams.get('category') || initialCategory;
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') as 'newest' | 'price_asc' | 'price_desc' | null;
    const urlMinPrice = searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!, 10) : undefined;
    const urlMaxPrice = searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!, 10) : undefined;
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;

    // Local state for inputs (debounced search, price inputs)
    const [searchInput, setSearchInput] = useState(urlSearch);
    const [minPriceInput, setMinPriceInput] = useState(urlMinPrice?.toString() ?? '');
    const [maxPriceInput, setMaxPriceInput] = useState(urlMaxPrice?.toString() ?? '');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Sync local state when URL changes externally (e.g. browser back/forward)
    useEffect(() => { setSearchInput(urlSearch); }, [urlSearch]);
    useEffect(() => { setMinPriceInput(urlMinPrice?.toString() ?? ''); }, [urlMinPrice]);
    useEffect(() => { setMaxPriceInput(urlMaxPrice?.toString() ?? ''); }, [urlMaxPrice]);

    // Helper to update URL search params (resets page when filters change)
    const updateSearchParams = useCallback((updates: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        // Reset to page 1 when filters change (unless explicitly setting page)
        if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
            params.delete('page');
        }
        router.push(`/products?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    // Debounced search effect (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== urlSearch) {
                updateSearchParams({ search: searchInput || undefined });
            }
        }, 300);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    // Categories
    const { data: categoriesRaw } = useCategories();
    const categories = (categoriesRaw ?? initialCategories) as Category[];
    const categoriesList = (Array.isArray(categories) ? categories : (categories as Record<string, unknown>)?.data || []) as Category[];

    // Paginated products query — all filtering is server-side
    const { data: productsData, isLoading: loading, error } = useProductsPaginated({
        category: urlCategory || undefined,
        search: urlSearch || undefined,
        sort: urlSort || undefined,
        min_price: urlMinPrice,
        max_price: urlMaxPrice,
        page: urlPage,
        limit: 20,
    });

    const products = (productsData?.data ?? initialProducts) as Product[];
    const total = productsData?.total ?? initialProducts.length;
    const currentPage = productsData?.page ?? 1;
    const totalPages = productsData?.totalPages ?? 1;

    // Category change handler
    const handleCategoryChange = useCallback((slug: string | null) => {
        updateSearchParams({ category: slug || undefined });
    }, [updateSearchParams]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setSearchInput('');
        setMinPriceInput('');
        setMaxPriceInput('');
        router.push('/products');
    }, [router]);

    // Get category properties helper
    const getCategoryProps = (category: Category) => ({
        name: category.attributes?.name || category.name || '',
        slug: category.attributes?.slug || category.slug || '',
        icon: category.attributes?.icon || category.icon || ''
    });

    // Get selected category name for display
    const selectedCategoryName = urlCategory
        ? categoriesList.find(c => (c.attributes?.slug || c.slug) === urlCategory)
        : null;
    const displayCategoryName = selectedCategoryName
        ? (selectedCategoryName.attributes?.name || selectedCategoryName.name)
        : null;

    const hasActiveFilters = !!(urlCategory || urlSearch || urlMinPrice !== undefined || urlMaxPrice !== undefined);

    return (
        <div className="min-h-screen bg-gray-50">
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
                        {total} produit{total !== 1 ? 's' : ''} trouv{'\u00e9'}{total !== 1 ? 's' : ''}
                        {productsData && ` \u2022 Page ${currentPage} sur ${totalPages}`}
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
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
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
                                            checked={!urlCategory}
                                            onChange={() => handleCategoryChange(null)}
                                            className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                        />
                                        <span className="ml-3 text-sm text-gray-700 group-hover:text-emerald-600 transition">
                                            Toutes les catégories
                                        </span>
                                    </label>

                                    {/* Dynamic Categories */}
                                    {categoriesList.map((category) => {
                                        const { name, slug, icon } = getCategoryProps(category);
                                        return (
                                            <label key={category.id} className="flex items-center cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    checked={urlCategory === slug}
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

                            {/* Price Range */}
                            <div className="mb-6">
                                <h3 className="font-medium text-gray-900 mb-3">Prix</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minPriceInput}
                                        onChange={(e) => setMinPriceInput(e.target.value)}
                                        onBlur={() => updateSearchParams({ min_price: minPriceInput || undefined })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') updateSearchParams({ min_price: minPriceInput || undefined }); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxPriceInput}
                                        onChange={(e) => setMaxPriceInput(e.target.value)}
                                        onBlur={() => updateSearchParams({ max_price: maxPriceInput || undefined })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') updateSearchParams({ max_price: maxPriceInput || undefined }); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
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
                        {urlCategory && (
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

                        {/* Active Filter Badges */}
                        {(urlSearch || urlMinPrice !== undefined || urlMaxPrice !== undefined) && (
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {urlSearch && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        Recherche: &quot;{urlSearch}&quot;
                                        <button
                                            onClick={() => { setSearchInput(''); updateSearchParams({ search: undefined }); }}
                                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {(urlMinPrice !== undefined || urlMaxPrice !== undefined) && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        Prix: {urlMinPrice ?? 0} - {urlMaxPrice ?? '\u221E'} MAD
                                        <button
                                            onClick={() => { setMinPriceInput(''); setMaxPriceInput(''); updateSearchParams({ min_price: undefined, max_price: undefined }); }}
                                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between border border-gray-100">
                            <span className="text-sm text-gray-600">
                                {total} produit{total !== 1 ? 's' : ''} trouv{'\u00e9'}{total !== 1 ? 's' : ''}
                                {productsData && ` \u2022 Page ${currentPage} sur ${totalPages}`}
                            </span>
                            <select
                                value={urlSort || 'newest'}
                                onChange={(e) => updateSearchParams({ sort: e.target.value === 'newest' ? undefined : e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                <option value="newest">{`Trier par: Plus r\u00e9cent`}</option>
                                <option value="price_asc">Prix: Croissant</option>
                                <option value="price_desc">{`Prix: D\u00e9croissant`}</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                                <p className="text-gray-600">Chargement des produits...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <div className="text-6xl mb-4">&#9888;&#65039;</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Erreur de chargement
                                </h3>
                                <p className="text-gray-600 mb-6">{error?.message || 'Failed to load products'}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                                >
                                    {`R\u00e9essayer`}
                                </button>
                            </div>
                        ) : products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map((product: Product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-8 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
                                            disabled={currentPage <= 1}
                                            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            {`Pr\u00e9c\u00e9dent`}
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter((page: number) => {
                                                if (page === 1 || page === totalPages) return true;
                                                if (Math.abs(page - currentPage) <= 1) return true;
                                                return false;
                                            })
                                            .reduce<(number | string)[]>((acc, page, idx, arr) => {
                                                if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) {
                                                    acc.push('...');
                                                }
                                                acc.push(page);
                                                return acc;
                                            }, [])
                                            .map((item, idx) =>
                                                typeof item === 'string' ? (
                                                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                                                ) : (
                                                    <button
                                                        key={item}
                                                        onClick={() => updateSearchParams({ page: item === 1 ? undefined : String(item) })}
                                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                                                            item === currentPage
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {item}
                                                    </button>
                                                )
                                            )}

                                        <button
                                            onClick={() => updateSearchParams({ page: String(currentPage + 1) })}
                                            disabled={currentPage >= totalPages}
                                            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Suivant
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <div className="text-6xl mb-4">&#128230;</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    {`Aucun produit trouv\u00e9`}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {hasActiveFilters
                                        ? `Aucun produit ne correspond \u00e0 vos crit\u00e8res. Essayez d\u2019ajuster vos filtres.`
                                        : 'Revenez plus tard ou ajustez vos filtres.'
                                    }
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                        >
                                            Effacer les filtres
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
        </div>
    );
}

function ProductsGridLoading() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-600">Chargement...</p>
            </div>
        </div>
    );
}

export function ProductsGrid({ initialProducts, initialCategories, initialCategory }: ProductsGridProps) {
    return (
        <Suspense fallback={<ProductsGridLoading />}>
            <ProductsGridContent
                initialProducts={initialProducts}
                initialCategories={initialCategories}
                initialCategory={initialCategory}
            />
        </Suspense>
    );
}

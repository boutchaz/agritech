'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search,
    MapPin,
    Star,
    Package,
    ChevronRight,
    Loader2,
    Building2,
    X,
    Phone,
    Globe,
    BadgeCheck
} from 'lucide-react';
import { Seller } from '@/lib/api';
import { useSellers, useSellerCities } from '@/hooks/useSellers';

interface SellersContentProps {
    initialSellers: Seller[];
    initialTotal: number;
    initialCities: string[];
}

function SellersContentInner({ initialSellers, initialTotal, initialCities }: SellersContentProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Filters from URL
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');

    const { data: citiesData } = useSellerCities();
    const cities = citiesData ?? initialCities;

    const { data: sellersData, isLoading: loading } = useSellers({
        city: selectedCity || undefined,
        search: searchParams.get('search') || undefined,
    });
    const sellers = sellersData?.sellers ?? initialSellers;
    const total = sellersData?.total ?? initialTotal;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedCity) params.set('city', selectedCity);
        router.push(`/sellers?${params.toString()}`);
    };

    const handleCityChange = (city: string) => {
        setSelectedCity(city);
        const params = new URLSearchParams(searchParams.toString());
        if (city) {
            params.set('city', city);
        } else {
            params.delete('city');
        }
        router.push(`/sellers?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedCity('');
        router.push('/sellers');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Nos Partenaires</h1>
                    <p className="text-gray-600">
                        Decouvrez nos vendeurs et producteurs agricoles de confiance
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-8">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher un partenaire..."
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* City Filter */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={selectedCity}
                                onChange={(e) => handleCityChange(e.target.value)}
                                className="pl-10 pr-8 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white min-w-[200px]"
                            >
                                <option value="">Toutes les villes</option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                        >
                            Rechercher
                        </button>
                    </form>

                    {/* Active Filters */}
                    {(selectedCity || searchParams.get('search')) && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-500">Filtres actifs:</span>
                            {selectedCity && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {selectedCity}
                                    <button onClick={() => handleCityChange('')} className="ml-1 hover:text-emerald-900">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                            {searchParams.get('search') && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                    &quot;{searchParams.get('search')}&quot;
                                    <button onClick={clearFilters} className="ml-1 hover:text-emerald-900">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                            <button
                                onClick={clearFilters}
                                className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                            >
                                Effacer tout
                            </button>
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div className="mb-6">
                    <p className="text-gray-600">
                        {total} partenaire{total !== 1 ? 's' : ''} trouve{total !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Sellers Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                ) : sellers.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border">
                        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun partenaire trouve</h2>
                        <p className="text-gray-500 mb-6">
                            Essayez de modifier vos criteres de recherche
                        </p>
                        <button
                            onClick={clearFilters}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                        >
                            Voir tous les partenaires
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sellers.map((seller) => (
                            <Link
                                key={seller.id}
                                href={`/sellers/${seller.slug || seller.id}`}
                                className="bg-white rounded-xl border hover:shadow-lg transition-shadow overflow-hidden group"
                            >
                                {/* Header with Logo */}
                                <div className="p-6 flex items-start gap-4">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {seller.logo_url ? (
                                            <img
                                                src={seller.logo_url}
                                                alt={seller.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Building2 className="h-8 w-8 text-emerald-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition">
                                                {seller.name}
                                            </h3>
                                            {seller.is_verified && (
                                                <BadgeCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        {seller.city && (
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {seller.city}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {seller.description && (
                                    <div className="px-6 pb-4">
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {seller.description}
                                        </p>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="px-6 pb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            <Package className="h-4 w-4" />
                                            <span>{seller.product_count} produit{seller.product_count !== 1 ? 's' : ''}</span>
                                        </div>
                                        {seller.average_rating && (
                                            <div className="flex items-center gap-1 text-sm">
                                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                <span className="text-gray-600">{seller.average_rating.toFixed(1)}</span>
                                                <span className="text-gray-400">({seller.review_count})</span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition" />
                                </div>

                                {/* Contact Info Footer */}
                                {(seller.phone || seller.website) && (
                                    <div className="px-6 py-3 bg-gray-50 border-t flex items-center gap-4 text-sm text-gray-500">
                                        {seller.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {seller.phone}
                                            </span>
                                        )}
                                        {seller.website && (
                                            <span className="flex items-center gap-1">
                                                <Globe className="h-3 w-3" />
                                                Site web
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SellersContent(props: SellersContentProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        }>
            <SellersContentInner {...props} />
        </Suspense>
    );
}

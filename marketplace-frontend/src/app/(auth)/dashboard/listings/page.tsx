'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import { Package, Plus, Edit, Trash2, Eye, EyeOff, LogOut, ArrowLeft } from 'lucide-react';

export default function ListingsPage() {
    const router = useRouter();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await ApiClient.getCurrentUser();
            setUser(currentUser);

            const myListings = await ApiClient.getMyListings();
            setListings(myListings);
        } catch (error) {
            console.error('Failed to load listings:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce?')) {
            return;
        }

        setDeleting(id);
        try {
            await ApiClient.deleteListing(id);
            setListings(listings.filter(l => l.id !== id));
        } catch (error) {
            console.error('Failed to delete listing:', error);
            alert('Échec de la suppression de l\'annonce');
        } finally {
            setDeleting(null);
        }
    };

    const handleToggleVisibility = async (listing: any) => {
        try {
            await ApiClient.updateListing(listing.id, {
                is_public: !listing.is_public
            });
            setListings(listings.map(l =>
                l.id === listing.id ? { ...l, is_public: !l.is_public } : l
            ));
        } catch (error) {
            console.error('Failed to update listing:', error);
            alert('Échec de la mise à jour de la visibilité');
        }
    };

    const handleLogout = async () => {
        await ApiClient.logout();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">🌱</div>
                    <p className="text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <span className="text-2xl">🌱</span>
                            <span className="text-xl font-bold text-green-700">AgriTech Market</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard" className="text-gray-700 hover:text-green-700 flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Tableau de bord
                            </Link>
                            <div className="text-sm text-gray-500">
                                {user?.email}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mes Annonces</h1>
                        <p className="text-gray-600">Gérez vos produits en vente</p>
                    </div>
                    <Link
                        href="/dashboard/listings/new"
                        className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Nouvelle Annonce</span>
                    </Link>
                </div>

                {/* Listings Grid */}
                {listings.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune annonce</h3>
                        <p className="text-gray-600 mb-6">
                            Commencez à vendre en créant votre première annonce
                        </p>
                        <Link
                            href="/dashboard/listings/new"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Créer une annonce</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((listing) => (
                            <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                                {/* Image */}
                                <div className="relative h-48 bg-gray-200">
                                    {listing.images && listing.images.length > 0 ? (
                                        <img
                                            src={listing.images[0]}
                                            alt={listing.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="h-16 w-16 text-gray-400" />
                                        </div>
                                    )}
                                    {!listing.is_public && (
                                        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            Masqué
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2">
                                        {listing.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                        {listing.short_description || listing.description}
                                    </p>
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <span className="text-2xl font-bold text-green-600">
                                            {listing.price} MAD
                                        </span>
                                        <span className="text-gray-500 text-sm">
                                            / {listing.unit}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/dashboard/listings/${listing.id}/edit`}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Modifier
                                        </Link>
                                        <button
                                            onClick={() => handleToggleVisibility(listing)}
                                            className="flex items-center justify-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                                            title={listing.is_public ? 'Masquer' : 'Publier'}
                                        >
                                            {listing.is_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(listing.id)}
                                            disabled={deleting === listing.id}
                                            className="flex items-center justify-center px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                                            title="Supprimer"
                                        >
                                            {deleting === listing.id ? (
                                                <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMyListings, useDeleteListing, useUpdateListing } from '@/hooks/useListings';
import { Package, Plus, Edit, Trash2, Eye, EyeOff, LogOut, ArrowLeft, ExternalLink } from 'lucide-react';

export default function ListingsPage() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [userLoading, setUserLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const currentUser = await ApiClient.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error('Failed to load user:', error);
                router.push('/login');
            } finally {
                setUserLoading(false);
            }
        }
        loadUser();
    }, [router]);

    const { data: listings = [], isLoading: listingsLoading } = useMyListings();
    const deleteListing = useDeleteListing();
    const updateListing = useUpdateListing();

    const loading = userLoading || listingsLoading;

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce?')) {
            return;
        }

        try {
            await deleteListing.mutateAsync(id);
        } catch (error) {
            console.error('Failed to delete listing:', error);
            alert('Échec de la suppression de l\'annonce');
        }
    };

    const handleToggleVisibility = async (listing: any) => {
        try {
            await updateListing.mutateAsync({
                id: listing.id,
                data: { is_public: !listing.is_public }
            });
        } catch (error) {
            console.error('Failed to update listing:', error);
            alert('Échec de la mise à jour de la visibilité');
        }
    };

    const handleLogout = async () => {
        await signOut();
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
                            <span className="text-xl font-bold text-green-700">AgroGina Market</span>
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
                                type="button"
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
                                    <div className="absolute top-2 left-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            listing.is_public
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {listing.is_public ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
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

                                    {/* Marketplace Link */}
                                    {listing.is_public && (
                                        <Link
                                            href={`/products/${listing.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-4"
                                        >
                                            Voir sur la marketplace <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    )}

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
                                            type="button"
                                            onClick={() => handleToggleVisibility(listing)}
                                            className="flex items-center justify-center px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                                            title={listing.is_public ? 'Masquer' : 'Publier'}
                                        >
                                            {listing.is_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(listing.id)}
                                            disabled={deleteListing.isPending}
                                            className="flex items-center justify-center px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                                            title="Supprimer"
                                        >
                                            {deleteListing.isPending ? (
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

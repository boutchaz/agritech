'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboard';
import Link from 'next/link';
import { useOrders } from '@/hooks/useOrders';
import { Package, ShoppingCart, ShoppingBag, TrendingUp, Plus, LogOut, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
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
                console.error('Failed to load dashboard:', error);
                router.push('/login');
            } finally {
                setUserLoading(false);
            }
        }
        loadUser();
    }, [router]);

    const { data: stats = { listingsCount: 0, ordersCount: 0, revenue: 0 }, isLoading: statsLoading } = useDashboardStats(user?.organization_id || '');
    const { data: orders = [], isLoading: ordersLoading } = useOrders();
    const pendingOrdersCount = orders.filter((o: any) =>
        o.status === 'pending' && o.seller_organization_id === user?.organization_id
    ).length;
    const sellerOrders = orders.filter((o: any) =>
        o.seller_organization_id === user?.organization_id
    );
    const loading = userLoading || statsLoading || ordersLoading;

    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">🌱</div>
                    <p className="text-gray-600">Loading...</p>
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
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="text-2xl">🌱</span>
                            <span className="text-xl font-bold text-green-700">AgriTech Market</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link href="/products" className="text-gray-700 hover:text-green-700">
                                Parcourir les produits
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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Tableau de bord vendeur</h1>
                    <p className="text-gray-600">Gérez vos annonces et suivez vos ventes</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Package className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.listingsCount}</p>
                        <p className="text-gray-600">Annonces actives</p>
                        <Link
                            href="/dashboard/listings"
                            className="mt-4 inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                            Gérer les annonces →
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl p-6 border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-100 rounded-lg">
                                <ShoppingBag className="h-6 w-6 text-red-600" />
                            </div>
                            {pendingOrdersCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {pendingOrdersCount} en attente
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{sellerOrders.length}</p>
                        <p className="text-gray-600">Commandes reçues</p>
                        <a
                            href="https://agritech-dashboard.thebzlab.online/marketplace/orders"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                            Gérer les commandes <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <div className="bg-white rounded-xl p-6 border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.ordersCount}</p>
                        <p className="text-gray-600">Commandes en cours</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.revenue.toFixed(2)} MAD</p>
                        <p className="text-gray-600">Revenus totaux</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Actions rapides</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/dashboard/listings/new"
                            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Créer une annonce</span>
                        </Link>
                        <Link
                            href="/dashboard/listings"
                            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            Gérer les annonces
                        </Link>
                        <a
                            href="https://agritech-dashboard.thebzlab.online/marketplace/orders"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            Voir les commandes <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                            href="/dashboard/analytics"
                            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            Analytiques
                        </Link>
                    </div>
                </div>

                {/* Recent Listings */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Vos annonces</h2>
                        <Link href="/dashboard/listings" className="text-green-700 hover:text-green-800 text-sm font-semibold">
                            Voir tout →
                        </Link>
                    </div>

                    <div className="text-center py-12">
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
                            <span>Créer votre première annonce</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

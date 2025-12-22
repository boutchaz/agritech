'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import Link from 'next/link';
import { Package, ShoppingCart, TrendingUp, Plus, LogOut } from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({
        listingsCount: 0,
        ordersCount: 0,
        revenue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const currentUser = await ApiClient.getCurrentUser();
            setUser(currentUser);

            // Load stats if we have user data
            if (currentUser?.organization_id) {
                const dashboardStats = await ApiClient.getDashboardStats(currentUser.organization_id);
                setStats(dashboardStats);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            router.push('/login');
        } finally {
            setLoading(false);
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
                                Browse Products
                            </Link>
                            <div className="text-sm text-gray-500">
                                {user?.email}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Seller Dashboard</h1>
                    <p className="text-gray-600">Manage your listings and track your sales</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Active Listings</h3>
                            <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{stats.listingsCount}</p>
                        <p className="text-sm text-gray-500 mt-2">Total products listed</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{stats.ordersCount}</p>
                        <p className="text-sm text-gray-500 mt-2">Orders to fulfill</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{stats.revenue.toFixed(2)} MAD</p>
                        <p className="text-sm text-gray-500 mt-2">All time earnings</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/dashboard/listings/new"
                            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Create Listing</span>
                        </Link>
                        <Link
                            href="/dashboard/listings"
                            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            Manage Listings
                        </Link>
                        <Link
                            href="/dashboard/orders"
                            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            View Orders
                        </Link>
                        <Link
                            href="/dashboard/analytics"
                            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition"
                        >
                            Analytics
                        </Link>
                    </div>
                </div>

                {/* Recent Listings */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Your Listings</h2>
                        <Link href="/dashboard/listings" className="text-green-700 hover:text-green-800 text-sm font-semibold">
                            View All →
                        </Link>
                    </div>

                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings yet</h3>
                        <p className="text-gray-600 mb-6">
                            Start selling by creating your first product listing
                        </p>
                        <Link
                            href="/dashboard/listings/new"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Create Your First Listing</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

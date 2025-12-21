import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ApiClient } from '@/lib/api';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch stats using API
    let stats = { listingsCount: 0, ordersCount: 0, revenue: 0 };
    try {
        // We need organizationId. For now, assume API handles user lookup or we pass something.
        // Let's pass a placeholder or try to get it. 
        // Ideally the API determines the organization based on the Auth Token.
        // So we might not need to pass stats params if the API infers it from the user context.
        // Let's update ApiClient to support no-arg getDashboardStats which relies on token.
        // But for now, let's keep it simple and assume we fetch it.
        const response = await ApiClient.getDashboardStats('current'); // 'current' could signal API to look up
        stats = response;
    } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
    }

    const { listingsCount, ordersCount, revenue } = stats;

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b">
                <a className="flex items-center justify-center font-bold text-xl text-green-700" href="/">
                    AgriTech Market
                </a>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-gray-500">Welcome, {user.email}</span>
                    <form action="/api/auth/signout" method="post">
                        <button className="text-sm font-medium hover:underline text-red-600">
                            Sign Out
                        </button>
                    </form>
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Seller Dashboard</h1>

                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    <div className="p-6 bg-white rounded-lg shadow border">
                        <h3 className="text-sm font-medium text-gray-500">Total Listings</h3>
                        <p className="text-3xl font-bold mt-2">{listingsCount || 0}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow border">
                        <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
                        <p className="text-3xl font-bold mt-2">{ordersCount || 0}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow border">
                        <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
                        <p className="text-3xl font-bold mt-2">0.00 MAD</p>
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="flex gap-4">
                    <a href="/listings/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Create New Listing
                    </a>
                    <a href="/orders" className="px-4 py-2 border bg-white rounded hover:bg-gray-50">
                        View Orders
                    </a>
                </div>
            </main>
        </div>
    );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's active organization (assuming one for now or handle via context/query)
    // For simplicity, we just fetch listings created by this user in any org they belong to
    // Or better, we get the org from a 'user_organizations' table or similar. 
    // Let's assume we rely on RLS 'Organizations can manage own listings' 
    // which uses 'auth_users_view'.

    // Fetch stats (mocked or real count)
    const { count: listingsCount } = await supabase
        .from('marketplace_listings')
        .select('*', { count: 'exact', head: true });

    // Get user's organization from auth_users_view to filter orders
    const { data: userData } = await supabase
        .from('auth_users_view')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    const orgId = userData?.organization_id;

    const { count: ordersCount } = await supabase
        .from('marketplace_orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_organization_id', orgId || '00000000-0000-0000-0000-000000000000');

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

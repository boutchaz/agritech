import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export const revalidate = 60; // ISR: Revalidate every 60 seconds

async function getProducts() {
    try {
        return await ApiClient.getProducts();
    } catch (error) {
        console.error('Failed to fetch products', error);
        return [];
    }
}

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b">
                <a className="flex items-center justify-center font-bold text-xl text-green-700" href="/">
                    AgriTech Market
                </a>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                    <a className="text-sm font-medium underline underline-offset-4 pointer-events-none" href="/products">
                        Products
                    </a>
                    <a className="text-sm font-medium hover:underline underline-offset-4" href="/categories">
                        Categories
                    </a>
                    <a className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
                        Dashboard
                    </a>
                </nav>
            </header>
            <main className="flex-1 py-8 container mx-auto px-4 md:px-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight">Marketplace Listings</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{products.length} items found</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.length > 0 ? (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                <p>No products found at the moment. Please check back later.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

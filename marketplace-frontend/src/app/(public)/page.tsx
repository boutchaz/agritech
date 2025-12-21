import Link from 'next/link';
import { Search, ShoppingCart, User, Menu } from 'lucide-react';

export default function MarketplaceHome() {
  const categories = [
    {
      id: 1,
      name: 'Crops & Produce',
      description: 'Fresh fruits, vegetables, grains',
      icon: '🌾',
      href: '/products?category=crops'
    },
    {
      id: 2,
      name: 'Machinery & Equipment',
      description: 'Tractors, harvesters, irrigation systems',
      icon: '🚜',
      href: '/products?category=machinery'
    },
    {
      id: 3,
      name: 'Inputs & Supplies',
      description: 'Fertilizers, seeds, pesticides',
      icon: '🧪',
      href: '/products?category=inputs'
    },
    {
      id: 4,
      name: 'Livestock & Feed',
      description: 'Animals, feed, veterinary supplies',
      icon: '🐄',
      href: '/products?category=livestock'
    }
  ];

  const trustBadges = [
    { icon: '🚚', title: 'Fast Delivery', description: 'Direct from farm to you' },
    { icon: '✅', title: 'Quality Assured', description: 'Verified sellers only' },
    { icon: '🔒', title: 'Secure Payment', description: '100% secure transactions' },
    { icon: '💬', title: 'Customer Support', description: 'Dedicated assistance' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-green-700">AgriTech Market</span>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for products, categories..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Nav Icons */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-green-700">
                <User className="h-5 w-5" />
                <span className="text-sm">Account</span>
              </Link>
              <Link href="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-green-700">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm hidden md:inline">Cart</span>
              </Link>
              <button className="md:hidden">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Morocco's Premier Agricultural Marketplace
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Connect with trusted farms, suppliers, and buyers across the country
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="px-8 py-4 bg-white text-green-700 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Browse Products
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-green-700 text-white border-2 border-white rounded-lg font-semibold hover:bg-green-800 transition"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 text-center group"
              >
                <div className="text-6xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-700">
                  {category.name}
                </h3>
                <p className="text-gray-600 text-sm">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-12 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustBadges.map((badge, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-2">{badge.icon}</div>
                <h4 className="font-semibold text-gray-800 mb-1">{badge.title}</h4>
                <p className="text-sm text-gray-600">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Featured Products</h2>
            <Link href="/products" className="text-green-700 hover:text-green-800 font-semibold">
              View All →
            </Link>
          </div>
          <div className="text-center py-12 text-gray-500">
            <p>Loading products...</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">AgriTech Market</h3>
              <p className="text-gray-400 text-sm">
                Morocco's trusted platform for agricultural trade
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/products" className="hover:text-white">All Products</Link></li>
                <li><Link href="/products?category=crops" className="hover:text-white">Crops</Link></li>
                <li><Link href="/products?category=machinery" className="hover:text-white">Machinery</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sell</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white">Seller Dashboard</Link></li>
                <li><Link href="/dashboard/listings" className="hover:text-white">My Listings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2025 AgriTech Market. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

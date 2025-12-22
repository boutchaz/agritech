'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, User, Menu, Loader2 } from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Category } from '@/components/CategoryCard';

// Fallback categories when CMS is not available
const fallbackCategories = [
  {
    id: 1,
    name: 'Cultures & Récoltes',
    description: 'Fruits, légumes, céréales frais',
    icon: '🌾',
    slug: 'crops'
  },
  {
    id: 2,
    name: 'Machines & Équipements',
    description: 'Tracteurs, moissonneuses, irrigation',
    icon: '🚜',
    slug: 'machinery'
  },
  {
    id: 3,
    name: 'Intrants & Fournitures',
    description: 'Engrais, semences, pesticides',
    icon: '🧪',
    slug: 'inputs'
  },
  {
    id: 4,
    name: 'Bétail & Aliments',
    description: 'Animaux, aliments, vétérinaire',
    icon: '🐄',
    slug: 'livestock'
  }
];

const trustBadges = [
  { icon: '🚚', title: 'Livraison Rapide', description: 'Direct de la ferme' },
  { icon: '✅', title: 'Qualité Assurée', description: 'Vendeurs vérifiés' },
  { icon: '🔒', title: 'Paiement Sécurisé', description: 'Transactions 100% sûres' },
  { icon: '💬', title: 'Support Client', description: 'Assistance dédiée' }
];

export default function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    // Fetch categories from CMS
    async function fetchCategories() {
      try {
        const response = await ApiClient.getCategories();
        const cmsCategories = response.data || response || [];

        if (cmsCategories.length > 0) {
          setCategories(cmsCategories);
        } else {
          // Use fallback if CMS returns empty
          setCategories(fallbackCategories as any);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(fallbackCategories as any);
      } finally {
        setLoadingCategories(false);
      }
    }

    // Fetch featured products
    async function fetchProducts() {
      try {
        const data = await ApiClient.getProducts();
        setProducts((data || []).slice(0, 8)); // Show max 8 products
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchCategories();
    fetchProducts();
  }, []);

  // Helper to get category properties (handles both Strapi and direct format)
  const getCategoryProps = (category: Category) => ({
    name: category.attributes?.name || category.name || '',
    slug: category.attributes?.slug || category.slug || '',
    description: category.attributes?.description || category.description || '',
    icon: category.attributes?.icon || category.icon || ''
  });

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
                  placeholder="Rechercher des produits, catégories..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Nav Icons */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-green-700">
                <User className="h-5 w-5" />
                <span className="text-sm">Compte</span>
              </Link>
              <Link href="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-green-700">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm hidden md:inline">Panier</span>
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
            La Marketplace Agricole du Maroc
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Connectez-vous avec des fermes, fournisseurs et acheteurs de confiance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="px-8 py-4 bg-white text-green-700 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Parcourir les Produits
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-green-700 text-white border-2 border-white rounded-lg font-semibold hover:bg-green-800 transition"
            >
              Commencer à Vendre
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">
              Parcourir par Catégorie
            </h2>
            <Link href="/categories" className="text-green-700 hover:text-green-800 font-semibold">
              Voir tout →
            </Link>
          </div>

          {loadingCategories ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.slice(0, 8).map((category) => {
                const { name, slug, description, icon } = getCategoryProps(category);
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${slug}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 text-center group"
                  >
                    <div className="text-6xl mb-4">{icon || '📦'}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-700">
                      {name}
                    </h3>
                    {description && (
                      <p className="text-gray-600 text-sm">{description}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
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
            <h2 className="text-3xl font-bold text-gray-800">Produits en Vedette</h2>
            <Link href="/products" className="text-green-700 hover:text-green-800 font-semibold">
              Voir tout →
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 mb-4">Aucun produit disponible pour le moment</p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Ajouter vos produits
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">AgriTech Market</h3>
              <p className="text-gray-400 text-sm">
                La plateforme de confiance pour le commerce agricole au Maroc
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Acheter</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/products" className="hover:text-white">Tous les Produits</Link></li>
                <li><Link href="/categories" className="hover:text-white">Catégories</Link></li>
                <li><Link href="/products?category=crops" className="hover:text-white">Cultures</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Vendre</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white">Tableau de bord</Link></li>
                <li><Link href="/dashboard/listings" className="hover:text-white">Mes Annonces</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-white">Contactez-nous</Link></li>
                <li><Link href="/help" className="hover:text-white">Centre d'aide</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2025 AgriTech Market. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}

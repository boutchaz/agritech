'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronRight, User, Menu, X, Loader2, ArrowRight, Leaf, Check } from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Category } from '@/components/CategoryCard';

// Fallback categories when CMS is not available
const fallbackCategories = [
  { id: 1, name: 'Cultures & Récoltes', description: 'Fruits, légumes, céréales frais', icon: '🌾', slug: 'crops', is_featured: true },
  { id: 2, name: 'Machines & Équipements', description: 'Tracteurs, moissonneuses, irrigation', icon: '🚜', slug: 'machinery', is_featured: true },
  { id: 3, name: 'Intrants & Fournitures', description: 'Engrais, semences, pesticides', icon: '🧪', slug: 'inputs', is_featured: true },
  { id: 4, name: 'Bétail & Aliments', description: 'Animaux, aliments, vétérinaire', icon: '🐄', slug: 'livestock', is_featured: true },
  { id: 5, name: 'Fruits', description: 'Oranges, pommes, raisins', icon: '🍊', slug: 'fruits', is_featured: false },
  { id: 6, name: 'Légumes', description: 'Tomates, pommes de terre, oignons', icon: '🥬', slug: 'vegetables', is_featured: false },
  { id: 7, name: 'Huile d\'Olive', description: 'Huile vierge extra et produits oléicoles', icon: '🫒', slug: 'olive-oil', is_featured: true },
  { id: 8, name: 'Services Agricoles', description: 'Main d\'œuvre, conseil, transport', icon: '👨‍🌾', slug: 'services', is_featured: false },
];

export default function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await ApiClient.getCategories();
        const cmsCategories = response.data || response || [];
        if (cmsCategories.length > 0) {
          setCategories(cmsCategories);
        } else {
          setCategories(fallbackCategories as Category[]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(fallbackCategories as Category[]);
      } finally {
        setLoadingCategories(false);
      }
    }

    async function fetchProducts() {
      try {
        const data = await ApiClient.getProducts();
        setProducts((data || []).slice(0, 8));
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchCategories();
    fetchProducts();
  }, []);

  const getCategoryProps = (category: Category) => ({
    name: category.attributes?.name || category.name || '',
    slug: category.attributes?.slug || category.slug || '',
    description: category.attributes?.description || category.description || '',
    icon: category.attributes?.icon || category.icon || '',
    is_featured: category.attributes?.is_featured || category.is_featured || false,
  });

  const featuredCategories = categories.filter(c => getCategoryProps(c).is_featured);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AgriTech</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Market</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/products" className="text-gray-600 hover:text-gray-900 transition">
                Produits
              </Link>
              <Link href="/categories" className="text-gray-600 hover:text-gray-900 transition">
                Catégories
              </Link>
              <Link href="https://agritech-dashboard.thebzlab.online" className="text-gray-600 hover:text-gray-900 transition">
                Dashboard
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                Connexion
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center gap-2"
              >
                Commencer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="max-w-7xl mx-auto px-4 space-y-4">
              <Link href="/products" className="block text-gray-600 hover:text-gray-900">
                Produits
              </Link>
              <Link href="/categories" className="block text-gray-600 hover:text-gray-900">
                Catégories
              </Link>
              <Link href="https://agritech-dashboard.thebzlab.online" className="block text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <hr className="border-gray-100" />
              <Link href="/login" className="block text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link
                href="/signup"
                className="block w-full text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
              >
                Commencer
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              La marketplace agricole{' '}
              <span className="text-emerald-400">connectée</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl">
              Achetez et vendez des produits agricoles, équipements et services.
              Connectez-vous directement avec les producteurs et fournisseurs du Maroc.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="mt-8 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des produits, équipements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium flex items-center gap-2"
              >
                Rechercher
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Vendeurs vérifiés</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Support inclus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Parcourir par catégorie</h2>
            <p className="mt-4 text-gray-600">Trouvez ce dont vous avez besoin pour votre exploitation</p>
          </div>

          {loadingCategories ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredCategories.slice(0, 8).map((category) => {
                const { name, slug, icon, description } = getCategoryProps(category);
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${slug}`}
                    className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
                  >
                    <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition">
                      <span className="text-3xl">{icon || '📦'}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition">
                      {name}
                    </h3>
                    {description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir toutes les catégories
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Produits en vedette</h2>
              <p className="mt-2 text-gray-600">Découvrez nos dernières offres</p>
            </div>
            <Link
              href="/products"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pas encore de produits</h3>
              <p className="text-gray-600 mb-6">Soyez le premier à publier vos produits</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
              >
                Publier un produit
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="mt-10 text-center md:hidden">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir tous les produits
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à vendre vos produits ?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines de producteurs et fournisseurs qui utilisent déjà AgriTech Market
            pour développer leur activité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium"
            >
              Créer un compte vendeur
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="https://agritech-dashboard.thebzlab.online"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur text-white rounded-xl hover:bg-white/20 transition font-medium border border-white/20"
            >
              Découvrir la plateforme
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">AgriTech</span>
              </div>
              <p className="text-sm">
                La plateforme complète pour moderniser votre agriculture.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Produit</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/products" className="hover:text-white transition">Tous les produits</Link></li>
                <li><Link href="/categories" className="hover:text-white transition">Catégories</Link></li>
                <li><Link href="/signup" className="hover:text-white transition">Devenir vendeur</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition">FAQ</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Légal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-white transition">Confidentialité</Link></li>
                <li><Link href="#" className="hover:text-white transition">CGU</Link></li>
                <li><Link href="#" className="hover:text-white transition">Mentions légales</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
            © 2025 AgriTech. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}

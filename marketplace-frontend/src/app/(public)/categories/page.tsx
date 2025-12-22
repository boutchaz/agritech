'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api';
import { Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Loader2, Grid3X3, ChevronRight, Search, ArrowRight, Leaf, Menu, X } from 'lucide-react';

// Fallback categories
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await ApiClient.getCategories();
        const data = response.data || response || [];
        if (data.length > 0) {
          setCategories(data);
        } else {
          setCategories(fallbackCategories as Category[]);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
        setCategories(fallbackCategories as Category[]);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const getCategoryProps = (category: Category) => ({
    name: category.attributes?.name || category.name || '',
    slug: category.attributes?.slug || category.slug || '',
    description: category.attributes?.description || category.description || '',
    icon: category.attributes?.icon || category.icon || '',
    is_featured: category.attributes?.is_featured || category.is_featured || false,
  });

  const filteredCategories = categories.filter(cat => {
    const { name, description } = getCategoryProps(cat);
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || description.toLowerCase().includes(query);
  });

  const featuredCategories = filteredCategories.filter(c => getCategoryProps(c).is_featured);
  const otherCategories = filteredCategories.filter(c => !getCategoryProps(c).is_featured);

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
              <Link href="/categories" className="text-emerald-600 font-medium">
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
              <Link href="/categories" className="block text-emerald-600 font-medium">
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
      <section className="pt-24 pb-12 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
            <Link href="/" className="hover:text-white transition">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Catégories</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Grid3X3 className="h-8 w-8 text-emerald-400" />
                <h1 className="text-3xl md:text-4xl font-bold text-white">Toutes les catégories</h1>
              </div>
              <p className="text-gray-300 max-w-xl">
                Explorez notre marketplace agricole par catégorie. Trouvez des cultures, équipements, fournitures et plus encore.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Rechercher une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            </div>
          ) : filteredCategories.length > 0 ? (
            <>
              {/* Featured Categories */}
              {featuredCategories.length > 0 && !searchQuery && (
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">⭐</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Catégories populaires</h2>
                      <p className="text-gray-500 text-sm">Les plus consultées par nos utilisateurs</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {featuredCategories.map((category) => {
                      const { name, slug, description, icon } = getCategoryProps(category);
                      return (
                        <Link
                          key={category.id}
                          href={`/products?category=${slug}`}
                          className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 text-center"
                        >
                          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-300">
                            <span className="text-3xl">{icon || '📦'}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition">
                            {name}
                          </h3>
                          {description && (
                            <p className="text-gray-500 text-sm line-clamp-2">{description}</p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Categories */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">📂</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {searchQuery ? 'Résultats de recherche' : 'Toutes les catégories'}
                      </h2>
                      <p className="text-gray-500 text-sm">{filteredCategories.length} catégorie{filteredCategories.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {(searchQuery ? filteredCategories : otherCategories.length > 0 ? otherCategories : filteredCategories).map((category) => {
                    const { name, slug, icon } = getCategoryProps(category);
                    return (
                      <Link
                        key={category.id}
                        href={`/products?category=${slug}`}
                        className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 text-center"
                      >
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 transition">
                          <span className="text-2xl">{icon || '📦'}</span>
                        </div>
                        <h3 className="font-medium text-gray-800 text-sm group-hover:text-emerald-600 transition">
                          {name}
                        </h3>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Aucune catégorie trouvée
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? `Aucune catégorie ne correspond à "${searchQuery}"`
                  : 'Les catégories seront disponibles bientôt.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                >
                  Voir toutes les catégories
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {categories.length > 0 && !searchQuery && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-3xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Vous ne trouvez pas ce que vous cherchez ?
              </h2>
              <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                Publiez une demande et laissez les fournisseurs vous contacter directement.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-medium"
              >
                Créer une demande
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

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

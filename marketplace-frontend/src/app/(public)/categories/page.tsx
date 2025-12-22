'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api';
import { Category } from '@/components/CategoryCard';
import Link from 'next/link';
import { Loader2, Grid3X3, ChevronRight, Search } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await ApiClient.getCategories();
        const data = response.data || response || [];
        if (data.length > 0) {
          setCategories(data);
        } else {
          setCategories(fallbackCategories as any);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
        setCategories(fallbackCategories as any);
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
    is_featured: (category as any).attributes?.is_featured || (category as any).is_featured || false,
  });

  const filteredCategories = categories.filter(cat => {
    const { name, description } = getCategoryProps(cat);
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || description.toLowerCase().includes(query);
  });

  const featuredCategories = filteredCategories.filter(c => getCategoryProps(c).is_featured);
  const otherCategories = filteredCategories.filter(c => !getCategoryProps(c).is_featured);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="bg-green-700 text-white text-sm py-2">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <span>Bienvenue sur AgriTech Market - La marketplace agricole du Maroc</span>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/signup" className="hover:text-orange-300 transition">S'inscrire en tant que Pro</Link>
              <Link href="/login" className="hover:text-orange-300 transition">Se connecter</Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-3xl">🌱</span>
              <span className="text-2xl font-bold">
                <span className="text-green-700">Agri</span>
                <span className="text-orange-500">Tech</span>
              </span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-700 hover:text-orange-500 transition">Accueil</Link>
              <Link href="/products" className="text-gray-700 hover:text-orange-500 transition">Produits</Link>
              <Link href="/categories" className="text-orange-500 font-semibold">Catégories</Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-orange-500 transition">Tableau de bord</Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-orange-500 transition font-medium">
                Se connecter
              </Link>
              <Link href="/signup" className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium">
                S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-orange-500 transition">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Catégories</span>
        </nav>

        {/* Page Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Grid3X3 className="h-8 w-8" />
                <h1 className="text-3xl font-bold">Parcourir par Catégorie</h1>
              </div>
              <p className="text-green-100">
                Explorez notre marketplace agricole par catégorie. Trouvez des cultures, équipements, fournitures et plus encore.
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 px-4 py-3 pl-12 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Categories Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Chargement des catégories...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
            >
              Réessayer
            </button>
          </div>
        ) : filteredCategories.length > 0 ? (
          <>
            {/* Featured Categories */}
            {featuredCategories.length > 0 && !searchQuery && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-2xl">⭐</span>
                  <h2 className="text-2xl font-bold text-gray-900">Catégories Populaires</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {featuredCategories.map((category) => {
                    const { name, slug, description, icon } = getCategoryProps(category);
                    return (
                      <Link
                        key={category.id}
                        href={`/products?category=${slug}`}
                        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 text-center group border-2 border-transparent hover:border-orange-200"
                      >
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-3xl">{icon || '📦'}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-1 group-hover:text-orange-600 transition">
                          {name}
                        </h3>
                        {description && (
                          <p className="text-gray-500 text-sm line-clamp-2">{description}</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* All Categories */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">📂</span>
                <h2 className="text-2xl font-bold text-gray-900">
                  {searchQuery ? 'Résultats de recherche' : 'Toutes les Catégories'}
                </h2>
                <span className="bg-orange-100 text-orange-600 text-sm font-medium px-3 py-1 rounded-full">
                  {filteredCategories.length} catégories
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {(searchQuery ? filteredCategories : otherCategories.length > 0 ? otherCategories : filteredCategories).map((category) => {
                  const { name, slug, icon } = getCategoryProps(category);
                  return (
                    <Link
                      key={category.id}
                      href={`/products?category=${slug}`}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 text-center group border border-gray-100 hover:border-orange-200"
                    >
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition">
                        <span className="text-2xl">{icon || '📦'}</span>
                      </div>
                      <h3 className="font-medium text-gray-800 text-sm group-hover:text-orange-600 transition">
                        {name}
                      </h3>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
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
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                Voir toutes les catégories
              </button>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {categories.length > 0 && !searchQuery && (
          <div className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Explorez Notre Marketplace
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center text-white">
                <div className="text-3xl font-bold">{categories.length}</div>
                <div className="text-orange-100 text-sm">Catégories</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center text-white">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-orange-100 text-sm">Produits</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center text-white">
                <div className="text-3xl font-bold">100+</div>
                <div className="text-orange-100 text-sm">Vendeurs</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center text-white">
                <div className="text-3xl font-bold">12</div>
                <div className="text-orange-100 text-sm">Régions</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🌱</span>
                <span className="text-xl font-bold">
                  <span className="text-green-400">Agri</span>
                  <span className="text-orange-400">Tech</span>
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Votre partenaire de confiance pour vos projets agricoles au Maroc
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Liens</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/signup" className="hover:text-orange-400 transition">Inscription Pro</Link></li>
                <li><Link href="/products" className="hover:text-orange-400 transition">Rechercher Produits</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Catégories</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/products?category=crops" className="hover:text-orange-400 transition">Cultures & Récoltes</Link></li>
                <li><Link href="/products?category=machinery" className="hover:text-orange-400 transition">Machines & Équipements</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>📍 Casablanca, Maroc</li>
                <li>📧 contact@agritech-market.ma</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            Copyright © 2025 | Tous droits réservés
          </div>
        </div>
      </footer>
    </div>
  );
}

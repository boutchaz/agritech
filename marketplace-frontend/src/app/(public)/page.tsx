'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronRight, ChevronDown, User, Menu, X, Loader2 } from 'lucide-react';
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
  const [searchType, setSearchType] = useState<'products' | 'suppliers'>('products');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await ApiClient.getCategories();
        const cmsCategories = response.data || response || [];
        if (cmsCategories.length > 0) {
          setCategories(cmsCategories);
        } else {
          setCategories(fallbackCategories as any);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(fallbackCategories as any);
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
    is_featured: category.attributes?.is_featured || (category as any).is_featured || false,
  });

  const featuredCategories = categories.filter(c => getCategoryProps(c).is_featured);
  const productCategories = categories.filter(c => ['crops', 'fruits', 'vegetables', 'olive-oil', 'grains'].includes(getCategoryProps(c).slug));
  const serviceCategories = categories.filter(c => ['machinery', 'services', 'inputs', 'irrigation'].includes(getCategoryProps(c).slug));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        {/* Top bar */}
        <div className="bg-green-700 text-white text-sm py-2">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <span>Bienvenue sur AgriTech Market - La marketplace agricole du Maroc</span>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/signup" className="hover:text-orange-300 transition">S'inscrire en tant que Pro</Link>
              <Link href="/login" className="hover:text-orange-300 transition">Se connecter</Link>
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-3xl">🌱</span>
              <span className="text-2xl font-bold">
                <span className="text-green-700">Agri</span>
                <span className="text-orange-500">Tech</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link href="/" className="text-green-700 font-semibold hover:text-orange-500 transition">
                Accueil
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1 text-gray-700 hover:text-orange-500 transition font-medium">
                  Produits
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {categories.slice(0, 6).map((category) => {
                      const { name, slug, icon } = getCategoryProps(category);
                      return (
                        <Link
                          key={category.id}
                          href={`/products?category=${slug}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-600"
                        >
                          <span className="text-xl">{icon || '📦'}</span>
                          <span>{name}</span>
                        </Link>
                      );
                    })}
                    <div className="border-t my-1"></div>
                    <Link href="/categories" className="flex items-center gap-2 px-4 py-2 text-orange-600 font-medium hover:bg-orange-50">
                      Voir toutes les catégories
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-1 text-gray-700 hover:text-orange-500 transition font-medium">
                  Fournisseurs
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <Link href="/suppliers" className="flex items-center gap-3 px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-600">
                      <span className="text-xl">🏪</span>
                      <span>Tous les fournisseurs</span>
                    </Link>
                    <Link href="/suppliers?type=farm" className="flex items-center gap-3 px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-600">
                      <span className="text-xl">🌾</span>
                      <span>Fermes</span>
                    </Link>
                    <Link href="/suppliers?type=cooperative" className="flex items-center gap-3 px-4 py-2 hover:bg-orange-50 text-gray-700 hover:text-orange-600">
                      <span className="text-xl">🤝</span>
                      <span>Coopératives</span>
                    </Link>
                  </div>
                </div>
              </div>
              <Link href="/dashboard" className="text-gray-700 hover:text-orange-500 transition font-medium">
                Tableau de bord
              </Link>
            </nav>

            {/* Auth buttons desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-orange-500 transition font-medium"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                S'inscrire
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link href="/" className="block text-green-700 font-semibold">Accueil</Link>
              <Link href="/products" className="block text-gray-700">Produits</Link>
              <Link href="/categories" className="block text-gray-700">Catégories</Link>
              <Link href="/dashboard" className="block text-gray-700">Tableau de bord</Link>
              <div className="border-t pt-4 space-y-2">
                <Link href="/login" className="block text-gray-700">Se connecter</Link>
                <Link href="/signup" className="block px-4 py-2 bg-orange-500 text-white rounded-lg text-center">S'inscrire</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - Tachrone style */}
      <section className="relative bg-gradient-to-br from-green-50 via-white to-orange-50 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-6">
                La plateforme qui vous accompagne à trouver vos{' '}
                <span className="text-orange-500">produits</span> et{' '}
                <span className="text-green-600">fournisseurs</span> dans l'
                <span className="text-green-700">Agriculture</span>
              </h1>

              {/* Search Box */}
              <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-4 md:p-6 mt-8">
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      checked={searchType === 'products'}
                      onChange={() => setSearchType('products')}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-700 font-medium">Produits agricoles</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      checked={searchType === 'suppliers'}
                      onChange={() => setSearchType('suppliers')}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-700 font-medium">Fournisseurs</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher des produits, catégories, fournisseurs..."
                    className="w-full px-5 py-4 pr-14 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-lg"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative w-full h-[400px] rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-8xl mb-4">🌾</div>
                    <p className="text-2xl font-semibold">AgriTech Market</p>
                    <p className="text-green-100">Votre partenaire agricole</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills Section - Like Tachrone */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Trouver vos Produits</h2>
            <Link href="/products" className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium">
              Tout voir
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingCategories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                  activeCategory === null
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
                }`}
              >
                Tout
              </button>
              {categories.map((category) => {
                const { name, slug, icon } = getCategoryProps(category);
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(slug)}
                    className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                      activeCategory === slug
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Categories Grid */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingCategories ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              ))
            ) : (
              featuredCategories.slice(0, 4).map((category) => {
                const { name, slug, description, icon } = getCategoryProps(category);
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${slug}`}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-center group border-2 border-transparent hover:border-orange-200"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-4xl">{icon || '📦'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition">
                      {name}
                    </h3>
                    {description && (
                      <p className="text-gray-500 text-sm line-clamp-2">{description}</p>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Product Categories Section - Tachrone style */}
      {productCategories.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                🌾 Cultures & Récoltes
              </h2>
              <Link href="/products?category=crops" className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium">
                Tout voir
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <button className="flex-shrink-0 px-5 py-2.5 rounded-full bg-orange-500 text-white font-medium">
                Tout
              </button>
              {productCategories.map((category) => {
                const { name, slug } = getCategoryProps(category);
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${slug}`}
                    className="flex-shrink-0 px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600 font-medium transition whitespace-nowrap"
                  >
                    {name}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Services Section - Tachrone style */}
      {serviceCategories.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                🚜 Équipements & Services
              </h2>
              <Link href="/products?category=machinery" className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium">
                Tout voir
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <button className="flex-shrink-0 px-5 py-2.5 rounded-full bg-green-600 text-white font-medium">
                Tout
              </button>
              {serviceCategories.map((category) => {
                const { name, slug } = getCategoryProps(category);
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${slug}`}
                    className="flex-shrink-0 px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-600 font-medium transition whitespace-nowrap"
                  >
                    {name}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Produits en Vedette</h2>
            <Link href="/products" className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium">
              Tout voir
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <div className="text-7xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun produit disponible</h3>
              <p className="text-gray-500 mb-6">Soyez le premier à ajouter vos produits sur la marketplace</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                Ajouter vos produits
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Vous êtes producteur ou fournisseur ?
              </h2>
              <p className="text-green-100 text-lg mb-6">
                Rejoignez la plus grande marketplace agricole du Maroc. Vendez vos produits,
                trouvez de nouveaux clients et développez votre activité.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                >
                  Créer un compte Pro
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-3 bg-white/10 text-white border-2 border-white/30 rounded-lg hover:bg-white/20 transition font-medium"
                >
                  Nous contacter
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6 text-white text-center">
                  <div>
                    <div className="text-4xl font-bold">500+</div>
                    <div className="text-green-100">Producteurs</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">1000+</div>
                    <div className="text-green-100">Produits</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">12</div>
                    <div className="text-green-100">Régions</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">24/7</div>
                    <div className="text-green-100">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Like Tachrone */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Bienvenue sur AgriTech Market
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p>
                Bienvenue sur AgriTech Market, la plateforme de mise en relation dédiée au secteur agricole,
                pour les professionnels comme pour les particuliers.
              </p>
              <p>
                Que vous soyez producteur, fournisseur d'équipements, coopérative agricole, ou entreprise spécialisée,
                notre espace vous permet de développer votre visibilité, de répondre à des demandes qualifiées,
                et de nouer des partenariats durables.
              </p>
              <p>
                Notre plateforme propose :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Un moteur de recherche par catégorie, produit et localisation</li>
                <li>Des fiches producteurs détaillées avec références et spécialités</li>
                <li>Un espace de publication pour vos produits et services</li>
                <li>Un accès direct à un réseau qualifié d'acteurs de l'agriculture</li>
              </ul>
              <p className="text-green-700 font-medium">
                🔍 Professionnels de l'agriculture ou porteurs de projet : créez votre compte et entrez dans
                l'écosystème agricole de demain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 bg-orange-500">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-white">
              <span className="text-4xl">🚚</span>
              <div>
                <h3 className="text-xl font-bold">Abonnez-vous à notre newsletter</h3>
                <p className="text-orange-100">Restez informé des dernières nouveautés et offres spéciales</p>
              </div>
            </div>
            <form className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="px-4 py-3 rounded-lg w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium whitespace-nowrap"
              >
                S'abonner
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
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
              <p className="text-gray-400 text-sm mb-4">
                Votre partenaire de confiance pour vos projets agricoles au Maroc
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span>📘</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span>📷</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span>💼</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Liens</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/signup" className="hover:text-orange-400 transition">Inscription Pro</Link></li>
                <li><Link href="/products" className="hover:text-orange-400 transition">Rechercher Produits</Link></li>
                <li><Link href="/suppliers" className="hover:text-orange-400 transition">Rechercher Fournisseurs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Catégories</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/products?category=crops" className="hover:text-orange-400 transition">Cultures & Récoltes</Link></li>
                <li><Link href="/products?category=machinery" className="hover:text-orange-400 transition">Machines & Équipements</Link></li>
                <li><Link href="/products?category=inputs" className="hover:text-orange-400 transition">Intrants & Fournitures</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Casablanca, Maroc</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>contact@agritech-market.ma</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              Copyright © 2025 | Tous droits réservés
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/terms" className="hover:text-orange-400 transition">Conditions d'utilisation</Link>
              <Link href="/privacy" className="hover:text-orange-400 transition">Politique de confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

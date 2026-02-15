import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Package,
} from 'lucide-react';
import { ImageGallery } from './ImageGallery';
import { ProductActions } from './ProductActions';

interface Seller {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  short_description?: string;
  price: number;
  currency: string;
  images: string[];
  unit?: string;
  location_address?: string;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  item_code?: string;
  crop_type?: string;
  variety?: string;
  quantity_available?: number;
  organization_id?: string;
  source?: string;
  seller?: Seller;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.agritech.ma';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: 'Produit non trouvé - AgriTech Market' };
  }

  const description =
    product.description || product.short_description || `Achetez ${product.title} sur AgriTech Market`;
  const imageUrl = product.images?.[0];

  return {
    title: `${product.title} - AgriTech Market`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: 'website',
      url: `${SITE_URL}/products/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: currency || 'MAD',
  }).format(price);
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">404</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit non trouvé</h1>
            <p className="text-gray-600 mb-6">
              Le produit que vous recherchez n&apos;existe pas ou a été supprimé.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux produits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.short_description || '',
    image: product.images || [],
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'MAD',
      availability:
        product.quantity_available && product.quantity_available > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(product.seller
      ? {
          brand: {
            '@type': 'Organization',
            name: product.seller.name,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-600 transition">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-emerald-600 transition">Produits</Link>
          {product.category_name && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="hover:text-emerald-600 transition">{product.category_name}</span>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</span>
        </nav>

        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <ImageGallery images={images} title={product.title} />

          <div className="space-y-6">
            <div>
              {product.category_name && (
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full mb-3">
                  {product.category_name}
                </span>
              )}
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              {product.item_code && (
                <p className="text-sm text-gray-500">Réf: {product.item_code}</p>
              )}
            </div>

            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-700">
                  {formatPrice(product.price, product.currency)}
                </span>
                {product.unit && (
                  <span className="text-lg text-emerald-600">/ {product.unit}</span>
                )}
              </div>
              {product.quantity_available !== null && product.quantity_available !== undefined && (
                <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {product.quantity_available} {product.unit || 'unités'} disponibles
                </p>
              )}
            </div>

            {(product.description || product.short_description) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {product.description || product.short_description}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Détails du produit</h2>

              <div className="grid grid-cols-2 gap-4">
                {product.crop_type && (
                  <div>
                    <span className="text-sm text-gray-500">Type de culture</span>
                    <p className="font-medium text-gray-900">{product.crop_type}</p>
                  </div>
                )}
                {product.variety && (
                  <div>
                    <span className="text-sm text-gray-500">Variété</span>
                    <p className="font-medium text-gray-900">{product.variety}</p>
                  </div>
                )}
                {product.unit && (
                  <div>
                    <span className="text-sm text-gray-500">Unité de vente</span>
                    <p className="font-medium text-gray-900">{product.unit}</p>
                  </div>
                )}
                {product.created_at && (
                  <div>
                    <span className="text-sm text-gray-500">Publié le</span>
                    <p className="font-medium text-gray-900">{formatDate(product.created_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {product.location_address && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-500">Localisation</span>
                  <p className="font-medium text-gray-900">{product.location_address}</p>
                </div>
              </div>
            )}

            <ProductActions product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}

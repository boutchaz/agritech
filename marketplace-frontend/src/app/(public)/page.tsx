import type { Metadata } from 'next';
import HomeContent from './HomeContent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/categories?locale=fr`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || data || [];
  } catch {
    return [];
  }
}

async function getProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'AgriTech Market - La marketplace agricole connectée',
  description: 'Achetez et vendez des produits agricoles, équipements et services. Connectez-vous directement avec les producteurs et fournisseurs du Maroc.',
  openGraph: {
    title: 'AgriTech Market - La marketplace agricole connectée',
    description: 'Achetez et vendez des produits agricoles au Maroc.',
    type: 'website',
  },
};

export default async function MarketplaceHome() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  return <HomeContent initialCategories={categories} initialProducts={products} />;
}

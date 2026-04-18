import type { Metadata } from 'next';
import { ProductsGrid } from './ProductsGrid';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getProducts(category?: string) {
  try {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_BASE}/api/v1/marketplace/products${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

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

export const metadata: Metadata = {
  title: 'Produits Agricoles - AgroGina Market',
  description: 'Découvrez notre sélection de produits agricoles sur AgroGina Market.',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts(category),
    getCategories(),
  ]);

  return (
    <ProductsGrid
      initialProducts={products}
      initialCategories={categories}
      initialCategory={category || null}
    />
  );
}

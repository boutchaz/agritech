import type { Metadata } from 'next';
import CategoriesContent from './CategoriesContent';

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

export const metadata: Metadata = {
  title: 'Catégories - AgroGina Market',
  description: 'Explorez toutes les catégories de produits agricoles sur AgroGina Market.',
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesContent initialCategories={categories} />;
}

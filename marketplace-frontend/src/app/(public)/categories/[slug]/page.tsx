import type { Metadata } from 'next';
import CategoryProducts from './CategoryProducts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getCategory(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/categories/${slug}?locale=fr`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getProducts(category: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/marketplace/products?category=${encodeURIComponent(category)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  const name = category?.attributes?.name || category?.name || slug;
  const description = category?.attributes?.description || category?.description || '';
  return {
    title: `${name} - AgroGina Market`,
    description: description || `Découvrez les produits ${name} sur AgroGina Market.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategory(slug),
    getProducts(slug),
  ]);
  return (
    <CategoryProducts
      initialCategory={category}
      initialProducts={products}
      slug={slug}
    />
  );
}

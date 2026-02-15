import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.agritech.ma';

async function getProducts(): Promise<{ id: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/products`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getCategories(): Promise<{ slug?: string; attributes?: { slug?: string } }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/categories?locale=fr`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || data || [];
  } catch {
    return [];
  }
}

async function getSellers(): Promise<{ slug?: string; id: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.sellers || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, sellers] = await Promise.all([
    getProducts(),
    getCategories(),
    getSellers(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/sellers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => {
    const slug = cat.attributes?.slug || cat.slug;
    return {
      url: `${SITE_URL}/categories/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    };
  }).filter((entry) => entry.url !== `${SITE_URL}/categories/undefined`);

  const sellerPages: MetadataRoute.Sitemap = sellers.map((seller) => ({
    url: `${SITE_URL}/sellers/${seller.slug || seller.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...sellerPages];
}

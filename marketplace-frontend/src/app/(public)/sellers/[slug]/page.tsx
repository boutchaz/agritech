import type { Metadata } from 'next';
import SellerProfile from './SellerProfile';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getSeller(slug: string) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers/${slug}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

async function getSellerProducts(slug: string) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers/${slug}/products`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return { products: [], total: 0 };
        return res.json();
    } catch {
        return { products: [], total: 0 };
    }
}

async function getSellerReviews(slug: string) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers/${slug}/reviews`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return { reviews: [], total: 0 };
        return res.json();
    } catch {
        return { reviews: [], total: 0 };
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const seller = await getSeller(slug);

    if (!seller) {
      return { title: 'Partenaire non trouvé - AgroGina Market' };
    }

    return {
        title: `${seller.name} - AgroGina Market`,
        description: seller.description || `Découvrez ${seller.name} sur AgroGina Market.`,
        openGraph: {
            title: seller.name,
            description: seller.description || '',
            images: seller.logo_url ? [{ url: seller.logo_url }] : [],
        },
    };
}

export default async function SellerPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const [seller, productsData, reviewsData] = await Promise.all([
        getSeller(slug),
        getSellerProducts(slug),
        getSellerReviews(slug),
    ]);

    if (!seller) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Partenaire non trouvé</h1>
                    <p className="text-gray-500 mb-6">
                        Ce partenaire n&apos;existe pas ou n&apos;est plus disponible.
                    </p>
                    <Link
                        href="/sellers"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voir tous les partenaires
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <SellerProfile
            initialSeller={seller}
            initialProducts={productsData.products || []}
            initialProductsTotal={productsData.total || 0}
            initialReviews={reviewsData.reviews || []}
            initialReviewsTotal={reviewsData.total || 0}
            slug={slug}
        />
    );
}

import type { Metadata } from 'next';
import SellersContent from './SellersContent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getSellers() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return { sellers: [], total: 0 };
        return res.json();
    } catch {
        return { sellers: [], total: 0 };
    }
}

async function getCities() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/marketplace/sellers/cities`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export const metadata: Metadata = {
    title: 'Nos Partenaires - AgriTech Market',
    description: 'Découvrez nos vendeurs et producteurs agricoles de confiance sur AgriTech Market.',
};

export default async function SellersPage() {
    const [sellersData, cities] = await Promise.all([getSellers(), getCities()]);

    return (
        <SellersContent
            initialSellers={sellersData.sellers || []}
            initialTotal={sellersData.total || 0}
            initialCities={cities}
        />
    );
}

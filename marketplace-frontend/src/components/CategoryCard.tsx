'use client';

import Link from 'next/link';
import Image from 'next/image';

export interface Category {
    id: string | number;
    attributes?: {
        name: string;
        slug: string;
        description?: string;
        icon?: string;
        is_featured?: boolean;
        image?: {
            data?: {
                attributes?: {
                    url: string;
                    alternativeText?: string;
                };
            };
        };
    };
    // Direct properties (when not using Strapi format)
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    is_featured?: boolean;
    image?: { url: string };
}

interface CategoryCardProps {
    category: Category;
    variant?: 'default' | 'compact' | 'pill';
}

export function CategoryCard({ category, variant = 'default' }: CategoryCardProps) {
    // Handle both Strapi format (with attributes) and direct format
    const name = category.attributes?.name || category.name || '';
    const slug = category.attributes?.slug || category.slug || '';
    const description = category.attributes?.description || category.description || '';
    const icon = category.attributes?.icon || category.icon || '';
    const imageUrl = category.attributes?.image?.data?.attributes?.url ||
        category.image?.url ||
        '';

    if (variant === 'pill') {
        return (
            <Link
                href={`/products?category=${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-green-500 hover:bg-green-50 transition-all duration-200"
            >
                {icon && <span className="text-lg">{icon}</span>}
                <span className="text-sm font-medium text-gray-700">{name}</span>
            </Link>
        );
    }

    if (variant === 'compact') {
        return (
            <Link
                href={`/products?category=${slug}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-500 hover:shadow-md transition-all duration-200"
            >
                {icon ? (
                    <span className="text-2xl">{icon}</span>
                ) : imageUrl ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-bold">{name.charAt(0)}</span>
                    </div>
                )}
                <span className="font-medium text-gray-800">{name}</span>
            </Link>
        );
    }

    // Default variant - full card
    return (
        <Link
            href={`/products?category=${slug}`}
            className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-500 hover:shadow-lg transition-all duration-200"
        >
            {/* Image or Icon Section */}
            <div className="relative h-32 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : icon ? (
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {icon}
                    </span>
                ) : (
                    <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-green-700">
                            {name.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                    {name}
                </h3>
                {description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {description}
                    </p>
                )}
            </div>
        </Link>
    );
}

// Grid component for displaying multiple categories
interface CategoryGridProps {
    categories: Category[];
    variant?: 'default' | 'compact' | 'pill';
    columns?: 2 | 3 | 4 | 5 | 6;
}

export function CategoryGrid({ categories, variant = 'default', columns = 4 }: CategoryGridProps) {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-2 sm:grid-cols-3',
        4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
    };

    if (variant === 'pill') {
        return (
            <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                    <CategoryCard
                        key={category.id}
                        category={category}
                        variant="pill"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className={`grid ${gridCols[columns]} gap-4`}>
            {categories.map((category) => (
                <CategoryCard
                    key={category.id}
                    category={category}
                    variant={variant}
                />
            ))}
        </div>
    );
}

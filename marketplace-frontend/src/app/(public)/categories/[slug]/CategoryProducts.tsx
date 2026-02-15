'use client';

import { useCategoryBySlug } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ProductCard';
import Link from 'next/link';
import { Loader2, ChevronRight, ArrowLeft, Grid3X3 } from 'lucide-react';

interface CategoryProductsProps {
  initialCategory: Record<string, unknown> | null;
  initialProducts: Record<string, unknown>[];
  slug: string;
}

export default function CategoryProducts({ initialCategory, initialProducts, slug }: CategoryProductsProps) {
  const { data: categoryData, isLoading: categoryLoading, error: categoryError } = useCategoryBySlug(slug);
  const { data: productsData, isLoading: productsLoading } = useProducts(slug);

  const category = categoryData ?? initialCategory;
  const products = productsData ?? initialProducts;
  const loading = (categoryLoading && !initialCategory) || (productsLoading && initialProducts.length === 0);
  const error = categoryError;

  const categoryAttrs = category as Record<string, unknown> & { attributes?: Record<string, unknown> };
  const categoryName = (categoryAttrs?.attributes?.name || categoryAttrs?.name || slug) as string;
  const categoryDescription = (categoryAttrs?.attributes?.description || categoryAttrs?.description || '') as string;
  const categoryIcon = (categoryAttrs?.attributes?.icon || categoryAttrs?.icon || '') as string;

  const productsList = Array.isArray(products) ? products : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/categories" className="hover:text-green-700">Categories</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{categoryName}</span>
        </nav>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading category...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">&#x26A0;&#xFE0F;</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Category not found
            </h3>
            <p className="text-gray-600 mb-6">{error?.message || 'Failed to load category'}</p>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-8 mb-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                {categoryIcon && (
                  <span className="text-5xl">{categoryIcon}</span>
                )}
                <div>
                  <h1 className="text-3xl font-bold">{categoryName}</h1>
                  {categoryDescription && (
                    <p className="mt-2 text-green-100">{categoryDescription}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-green-100">
                <span>{productsList.length} products</span>
                <span>&bull;</span>
                <Link href="/categories" className="hover:text-white underline">
                  View all categories
                </Link>
              </div>
            </div>

            {productsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsList.map((product) => (
                  <ProductCard key={(product as Record<string, unknown>).id as string} product={product as Parameters<typeof ProductCard>[0]['product']} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">&#x1F4E6;</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No products in this category
                </h3>
                <p className="text-gray-600 mb-6">
                  Check back later or browse other categories.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/categories"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Browse Categories
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    View All Products
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

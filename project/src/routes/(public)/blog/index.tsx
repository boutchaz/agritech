import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { blogsApi } from '@/lib/api/blogs';
import { BlogList } from '@/components/blog/BlogList';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogNewsletter } from '@/components/blog/BlogNewsletter';
import { PopularPosts } from '@/components/blog/PopularPosts';
import { BlogCategories } from '@/components/blog/BlogCategories';

function BlogPage() {
  const { data: featuredPosts, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-blogs'],
    queryFn: () => blogsApi.getFeaturedBlogs(3),
    staleTime: 10 * 60 * 1000,
  });

  const { data: popularPosts } = useQuery({
    queryKey: ['popular-blogs'],
    queryFn: () => blogsApi.getBlogs({ limit: 5, sortBy: 'publishedAt', sortOrder: 'desc' }),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Integrated with app design */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
              AgriTech Blog
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Insights for Modern Agriculture
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
            Discover the latest trends, best practices, and innovations in agricultural
            technology. From precision farming to sustainable practices.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Featured Posts */}
            {!loadingFeatured && featuredPosts && featuredPosts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Featured Articles
                  </h2>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {featuredPosts[0] && (
                    <BlogCard post={featuredPosts[0]} featured />
                  )}
                  <div className="grid gap-4">
                    {featuredPosts.slice(1).map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Categories */}
            <BlogCategories />

            {/* All Posts */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Articles
                </h2>
              </div>
              <BlogList />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <PopularPosts posts={popularPosts?.data || []} />
            <BlogNewsletter />
          </aside>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/(public)/blog/')({
  component: BlogPage,
});

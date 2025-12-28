import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen, ArrowRight } from 'lucide-react';
import { blogsApi } from '../lib/api/blogs';
import { BlogList } from '../components/blog/BlogList';
import { BlogCard } from '../components/blog/BlogCard';

function BlogPage() {
  const { data: featuredPosts, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-blogs'],
    queryFn: () => blogsApi.getFeaturedBlogs(3),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8" />
            <span className="text-green-200 font-medium">AgriTech Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Insights for Modern Agriculture
          </h1>
          <p className="text-xl text-green-100 max-w-2xl">
            Discover the latest trends, best practices, and innovations in agricultural
            technology. From precision farming to sustainable practices.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Posts */}
        {!loadingFeatured && featuredPosts && featuredPosts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Featured Articles
              </h2>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {featuredPosts[0] && (
                <BlogCard post={featuredPosts[0]} featured />
              )}
              <div className="grid gap-6">
                {featuredPosts.slice(1).map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Posts */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            All Articles
          </h2>
          <BlogList />
        </section>
      </main>

      {/* Footer CTA */}
      <section className="bg-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers using AgriTech to optimize their operations
            and increase yields.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute('/blog')({
  component: BlogPage,
});

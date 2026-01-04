import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { BlogDetail } from '@/components/blog/BlogDetail';

function BlogPostPage() {
  const { slug } = Route.useParams();

  // Scroll to top when navigating to a blog post
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BlogDetail slug={slug} />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/(public)/blog/$slug')({
  component: BlogPostPage,
});

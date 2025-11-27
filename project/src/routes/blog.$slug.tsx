import { createFileRoute } from '@tanstack/react-router';
import { BlogDetail } from '../components/blog/BlogDetail';

function BlogPostPage() {
  const { slug } = Route.useParams();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BlogDetail slug={slug} />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
});

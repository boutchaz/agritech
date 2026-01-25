import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FolderTree } from 'lucide-react';
import { blogsApi } from '@/lib/api/blogs';

export function BlogCategories() {
  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => blogsApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });

  if (!categories || categories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <FolderTree className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Browse by Category</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/blog"
            search={{ category: category.slug }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 transition-colors"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

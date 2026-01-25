import { Link } from '@tanstack/react-router';
import { TrendingUp } from 'lucide-react';
import type { BlogPost } from '@/lib/api/blogs';

interface PopularPostsProps {
  posts: BlogPost[];
}

export function PopularPosts({ posts }: PopularPostsProps) {
  if (posts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Popular Posts</h3>
      </div>
      <div className="space-y-4">
        {posts.slice(0, 5).map((post, index) => (
          <Link
            key={post.id}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="block group"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                  {post.title}
                </h4>
                {post.excerpt && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

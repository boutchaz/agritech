import { Link } from '@tanstack/react-router';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import type { BlogPost } from '../../lib/api/blogs';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  // Defensive check: ensure slug exists before rendering
  if (!post.slug) {
    return null;
  }

  // Image URL should already be a full URL from the NestJS API
  const imageUrl = post.featured_image?.url || null;

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300">
        <Link 
          to="/blog/$slug" 
          params={{ slug: post.slug }}
          className="block w-full h-full cursor-pointer"
        >
          {imageUrl && (
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src={imageUrl}
                alt={post.featured_image?.alternativeText || post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              {post.blog_category && (
                <span className="absolute top-4 left-4 px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full pointer-events-none z-10">
                  {post.blog_category.name}
                </span>
              )}
            </div>
          )}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
              {post.title}
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 line-clamp-3">
              {post.excerpt}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author}
                </span>
                {formattedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formattedDate}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.reading_time} min read
                </span>
              </div>
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium group-hover:gap-2 transition-all">
                Read more <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300">
      <Link 
        to="/blog/$slug" 
        params={{ slug: post.slug }}
        className="block w-full h-full flex flex-col flex-1 cursor-pointer"
      >
        {imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={imageUrl}
              alt={post.featured_image?.alternativeText || post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {post.blog_category && (
              <span className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded-full pointer-events-none z-10">
                {post.blog_category.name}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col flex-1 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 flex-1">
            {post.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time} min
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

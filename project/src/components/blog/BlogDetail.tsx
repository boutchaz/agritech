import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Calendar, Clock, User, ArrowLeft, Tag } from 'lucide-react';
import { marked } from 'marked';
import { useMemo } from 'react';
import { blogsApi } from '../../lib/api/blogs';
import { BlogCard } from './BlogCard';
import { ReadingProgress } from './ReadingProgress';
import { TableOfContents } from './TableOfContents';
import { AuthorProfile } from './AuthorProfile';
import { SocialShare } from './SocialShare';

interface BlogDetailProps {
  slug: string;
}

export function BlogDetail({ slug }: BlogDetailProps) {
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const result = await blogsApi.getBlogBySlug(slug);
      return result;
    },
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ['related-blogs', slug],
    queryFn: () => blogsApi.getRelatedBlogs(slug, 3),
    enabled: !!post,
  });

  // All hooks must run unconditionally before any early returns
  const htmlContent = useMemo(() => {
    if (!post?.content) return '';
    const result = marked(post.content, {
      breaks: true,
      gfm: true,
    });
    return typeof result === 'string' ? result : '';
  }, [post?.content]);

  const { processedContent, headings } = useMemo(() => {
    if (!htmlContent || typeof window === 'undefined') {
      return { processedContent: htmlContent, headings: [] as Array<{ id: string; text: string; level: string }> };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headingElements = doc.querySelectorAll('h2, h3');
    const extractedHeadings: Array<{ id: string; text: string; level: string }> = [];
    let headingIndex = 0;
    headingElements.forEach((heading) => {
      const id = `heading-${headingIndex}`;
      heading.id = id;
      extractedHeadings.push({
        id,
        text: heading.textContent || '',
        level: heading.tagName.toLowerCase(),
      });
      headingIndex++;
    });
    return {
      processedContent: doc.body.innerHTML,
      headings: extractedHeadings,
    };
  }, [htmlContent]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 px-4 py-3 rounded mb-4">
          Loading blog post: {slug}...
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8" />
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl mb-8" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error ? String(error) : 'Post data is null'}
          <br />
          <strong>Slug:</strong> {slug}
        </div>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Post not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = post.featured_image?.url || null;
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : '';

  return (
    <>
      <ReadingProgress />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <article className="lg:col-span-3">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            {post.blog_category && (
              <Link
                to="/blog"
                search={{ category: post.blog_category.slug }}
                className="inline-block px-3 py-1 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                {post.blog_category.name}
              </Link>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              {formattedDate && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.reading_time} min read
              </span>
            </div>

            {/* Social Share */}
            <SocialShare url={postUrl} title={post.title} />
          </header>

          {/* Featured Image */}
          {imageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
              <img
                src={imageUrl}
                alt={post.featured_image?.alternativeText || post.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-green-600 dark:prose-a:text-green-400 prose-img:rounded-xl prose-headings:scroll-mt-20"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />

          {/* Author Profile */}
          <AuthorProfile author={post.author} />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to="/blog"
                    search={{ tag }}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Related Articles
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {headings.length > 0 && <TableOfContents headings={headings} />}
          </div>
        </aside>
      </div>
    </>
  );
}

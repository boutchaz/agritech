const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BASE_URL = '/api/v1/blogs';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BlogImage {
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image?: BlogImage;
  author: string;
  reading_time: number;
  is_featured: boolean;
  tags?: string[];
  blog_category?: BlogCategory;
  seo_title?: string;
  seo_description?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PaginatedBlogs {
  data: BlogPost[];
  meta: PaginationMeta;
}

export interface BlogFilters {
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// PUBLIC API HELPER (no auth required)
// =====================================================

async function publicFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
      error: 'Unknown error',
      statusCode: response.status,
    }));
    throw new Error(error.message || error.error || 'API request failed');
  }

  return response.json();
}

// =====================================================
// API CLIENT
// =====================================================

export const blogsApi = {
  /**
   * Get all published blog posts with filters and pagination
   */
  async getBlogs(filters: BlogFilters = {}): Promise<PaginatedBlogs> {
    const params = new URLSearchParams();

    if (filters.category) params.append('category', filters.category);
    if (filters.tag) params.append('tag', filters.tag);
    if (filters.search) params.append('search', filters.search);
    if (filters.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    return publicFetch<PaginatedBlogs>(url);
  },

  /**
   * Get featured blog posts
   */
  async getFeaturedBlogs(limit: number = 3): Promise<BlogPost[]> {
    return publicFetch<BlogPost[]>(`${BASE_URL}/featured?limit=${limit}`);
  },

  /**
   * Get a single blog post by slug
   */
  async getBlogBySlug(slug: string): Promise<BlogPost> {
    try {
      console.log('[blogsApi] Fetching blog by slug:', slug);
      const result = await publicFetch<BlogPost>(`${BASE_URL}/${slug}`);
      console.log('[blogsApi] Blog fetched successfully:', result?.title);
      return result;
    } catch (error) {
      console.error('[blogsApi] Error fetching blog by slug:', error);
      throw error;
    }
  },

  /**
   * Get related blog posts
   */
  async getRelatedBlogs(slug: string, limit: number = 3): Promise<BlogPost[]> {
    return publicFetch<BlogPost[]>(`${BASE_URL}/${slug}/related?limit=${limit}`);
  },

  /**
   * Get all blog categories
   */
  async getCategories(): Promise<BlogCategory[]> {
    return publicFetch<BlogCategory[]>(`${BASE_URL}/categories`);
  },

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(slug: string): Promise<BlogCategory> {
    return publicFetch<BlogCategory>(`${BASE_URL}/categories/${slug}`);
  },
};

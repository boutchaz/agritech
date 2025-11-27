import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StrapiService } from '../reference-data/strapi.service';
import { BlogFiltersDto } from './dto/blog-filters.dto';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image?: {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
  };
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

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface PaginatedBlogs {
  data: BlogPost[];
  meta: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  constructor(private readonly strapiService: StrapiService) {}

  /**
   * Get all published blog posts with filters and pagination
   */
  async getBlogs(filters: BlogFiltersDto): Promise<PaginatedBlogs> {
    const params: any = {
      populate: ['featured_image', 'blog_category'],
      sort: `${filters.sortBy}:${filters.sortOrder}`,
      'pagination[page]': filters.page,
      'pagination[pageSize]': filters.limit,
      publicationState: 'live',
    };

    // Category filter
    if (filters.category) {
      params['filters[blog_category][slug][$eq]'] = filters.category;
    }

    // Featured filter
    if (filters.featured !== undefined) {
      params['filters[is_featured][$eq]'] = filters.featured;
    }

    // Search filter
    if (filters.search) {
      params['filters[$or][0][title][$containsi]'] = filters.search;
      params['filters[$or][1][excerpt][$containsi]'] = filters.search;
    }

    // Tag filter (tags is JSON array)
    if (filters.tag) {
      params['filters[tags][$containsi]'] = filters.tag;
    }

    const response = await this.strapiService.get('/blogs', params);

    return {
      data: this.transformBlogPosts(response),
      meta: response.meta?.pagination || {
        page: filters.page,
        pageSize: filters.limit,
        pageCount: 1,
        total: 0,
      },
    };
  }

  /**
   * Get a single blog post by slug
   */
  async getBlogBySlug(slug: string): Promise<BlogPost> {
    const params = {
      'filters[slug][$eq]': slug,
      populate: ['featured_image', 'blog_category'],
      publicationState: 'live',
    };

    try {
      this.logger.debug(`Fetching blog post with slug: ${slug}`);
      const response = await this.strapiService.get('/blogs', params);
      this.logger.debug(`Strapi response for slug ${slug}:`, JSON.stringify(response, null, 2));
      
      const posts = this.transformBlogPosts(response);

      if (posts.length === 0) {
        this.logger.warn(`Blog post with slug "${slug}" not found or not published`);
        throw new NotFoundException(`Blog post with slug "${slug}" not found`);
      }

      this.logger.debug(`Successfully transformed blog post: ${posts[0].title}`);
      return posts[0];
    } catch (error) {
      this.logger.error(`Error fetching blog post with slug "${slug}":`, error);
      throw error;
    }
  }

  /**
   * Get a single blog post by ID
   */
  async getBlogById(id: number): Promise<BlogPost> {
    const params = {
      populate: ['featured_image', 'blog_category'],
    };

    const response = await this.strapiService.get(`/blogs/${id}`, params);
    return this.transformSingleBlogPost(response);
  }

  /**
   * Get featured blog posts
   */
  async getFeaturedBlogs(limit: number = 3): Promise<BlogPost[]> {
    const params = {
      'filters[is_featured][$eq]': true,
      populate: ['featured_image', 'blog_category'],
      sort: 'publishedAt:desc',
      'pagination[pageSize]': limit,
      publicationState: 'live',
    };

    try {
      this.logger.debug(`Fetching featured blogs with limit: ${limit}`);
      const response = await this.strapiService.get('/blogs', params);
      const posts = this.transformBlogPosts(response);
      this.logger.debug(`Found ${posts.length} featured blog posts`);
      return posts;
    } catch (error) {
      this.logger.error('Error fetching featured blogs:', error);
      throw error;
    }
  }

  /**
   * Get related blog posts by category
   */
  async getRelatedBlogs(slug: string, limit: number = 3): Promise<BlogPost[]> {
    // First get the current post to find its category
    const currentPost = await this.getBlogBySlug(slug);

    if (!currentPost.blog_category) {
      return [];
    }

    const params = {
      'filters[blog_category][id][$eq]': currentPost.blog_category.id,
      'filters[slug][$ne]': slug,
      populate: ['featured_image', 'blog_category'],
      sort: 'publishedAt:desc',
      'pagination[pageSize]': limit,
      publicationState: 'live',
    };

    const response = await this.strapiService.get('/blogs', params);
    return this.transformBlogPosts(response);
  }

  /**
   * Get all blog categories
   */
  async getCategories(): Promise<BlogCategory[]> {
    const params = {
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/blog-categories', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(slug: string): Promise<BlogCategory> {
    const params = {
      'filters[slug][$eq]': slug,
    };

    const response = await this.strapiService.get('/blog-categories', params);
    const categories = this.strapiService.transformResponse<BlogCategory>(response);

    if (categories.length === 0) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return categories[0];
  }

  /**
   * Transform Strapi blog response to clean format
   */
  private transformBlogPosts(response: any): BlogPost[] {
    if (!response?.data) return [];

    const data = Array.isArray(response.data) ? response.data : [response.data];

    return data.map((item: any) => this.transformBlogItem(item));
  }

  /**
   * Transform single blog post response
   */
  private transformSingleBlogPost(response: any): BlogPost {
    if (!response?.data) {
      throw new NotFoundException('Blog post not found');
    }
    return this.transformBlogItem(response.data);
  }

  /**
   * Transform a single blog item from Strapi format
   */
  private transformBlogItem(item: any): BlogPost {
    const attrs = item.attributes || item;

    try {
      return {
        id: item.id,
        title: attrs.title || '',
        slug: attrs.slug || '',
        excerpt: attrs.excerpt || '',
        content: attrs.content || '',
        featured_image: this.transformImage(attrs.featured_image),
        author: attrs.author || 'AgriTech Team',
        reading_time: attrs.reading_time || 5,
        is_featured: attrs.is_featured || false,
        tags: attrs.tags || [],
        blog_category: this.transformCategory(attrs.blog_category),
        seo_title: attrs.seo_title,
        seo_description: attrs.seo_description,
        publishedAt: attrs.publishedAt,
        createdAt: attrs.createdAt,
        updatedAt: attrs.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error transforming blog item:', error, { itemId: item.id });
      throw error;
    }
  }

  /**
   * Transform Strapi media format to clean image object
   * Handles both Strapi v4 nested format and direct format
   * Returns full URLs for images (not relative paths)
   */
  private transformImage(image: any): BlogPost['featured_image'] | undefined {
    if (!image) return undefined;

    // Get Strapi base URL (without /api suffix)
    const strapiApiUrl = process.env.STRAPI_API_URL || 'https://cms.thebzlab.online/api';
    const strapiBaseUrl = strapiApiUrl.replace('/api', '');
    
    // Helper to construct full URL
    const getFullUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // Ensure URL starts with / if it doesn't
      const path = url.startsWith('/') ? url : `/${url}`;
      return `${strapiBaseUrl}${path}`;
    };

    // Handle Strapi v4 format: image.data.attributes
    if (image?.data) {
      const imgData = image.data;
      const imgAttrs = imgData.attributes || imgData;
      
      // Handle array format (shouldn't happen for single image, but just in case)
      if (Array.isArray(imgAttrs)) {
        if (imgAttrs.length === 0) return undefined;
        const firstImg = imgAttrs[0];
        const url = firstImg.url || firstImg.attributes?.url;
        if (!url) return undefined;
        return {
          url: getFullUrl(url),
          alternativeText: firstImg.alternativeText || firstImg.attributes?.alternativeText,
          width: firstImg.width || firstImg.attributes?.width,
          height: firstImg.height || firstImg.attributes?.height,
        };
      }

      if (!imgAttrs.url) return undefined;
      return {
        url: getFullUrl(imgAttrs.url),
        alternativeText: imgAttrs.alternativeText,
        width: imgAttrs.width,
        height: imgAttrs.height,
      };
    }

    // Handle direct format: image.attributes or image itself
    const imgAttrs = image.attributes || image;
    if (imgAttrs?.url) {
      return {
        url: getFullUrl(imgAttrs.url),
        alternativeText: imgAttrs.alternativeText,
        width: imgAttrs.width,
        height: imgAttrs.height,
      };
    }

    return undefined;
  }

  /**
   * Transform Strapi relation format to clean category object
   */
  private transformCategory(category: any): BlogCategory | undefined {
    if (!category?.data) return undefined;

    const catAttrs = category.data.attributes || category.data;
    return {
      id: category.data.id,
      name: catAttrs.name,
      slug: catAttrs.slug,
      description: catAttrs.description,
    };
  }
}

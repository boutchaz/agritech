import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { BlogFiltersDto } from './dto/blog-filters.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all published blog posts with filters and pagination' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category slug' })
  @ApiQuery({ name: 'tag', required: false, description: 'Filter by tag' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and excerpt' })
  @ApiQuery({ name: 'featured', required: false, description: 'Filter featured posts only' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc/desc)' })
  @ApiResponse({ status: 200, description: 'Blog posts retrieved successfully' })
  async getBlogs(@Query() filters: BlogFiltersDto) {
    return this.blogsService.getBlogs(filters);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured blog posts' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts to return', type: Number })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (fr, ar, en)', type: String })
  @ApiResponse({ status: 200, description: 'Featured blog posts retrieved successfully' })
  async getFeaturedBlogs(@Query('limit') limit?: number, @Query('locale') locale?: string) {
    return this.blogsService.getFeaturedBlogs(limit || 3, locale || 'fr');
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories(@Query('locale') locale?: string) {
    return this.blogsService.getCategories(locale || 'fr');
  }

  @Get('categories/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a single category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.blogsService.getCategoryBySlug(slug, locale || 'fr');
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get a single blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getBlogBySlug(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.blogsService.getBlogBySlug(slug, locale || 'fr');
  }

  @Get(':slug/related')
  @Public()
  @ApiOperation({ summary: 'Get related blog posts by category' })
  @ApiParam({ name: 'slug', description: 'Current blog post slug' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of related posts', type: Number })
  @ApiResponse({ status: 200, description: 'Related blog posts retrieved successfully' })
  async getRelatedBlogs(
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
    @Query('locale') locale?: string,
  ) {
    return this.blogsService.getRelatedBlogs(slug, limit || 3, locale || 'fr');
  }
}

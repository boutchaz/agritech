import { Controller, Get, Param, Query, Res, HttpStatus, Logger, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { BlogSsrService } from './blog-ssr.service';

@ApiTags('blog-ssr')
@Controller('blog')
export class BlogSsrController {
  private readonly logger = new Logger(BlogSsrController.name);

  constructor(private readonly blogSsrService: BlogSsrService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Blog listing page (server-rendered HTML)' })
  @ApiQuery({ name: 'lang', required: false, description: 'Locale (fr, ar, en)', type: String })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category slug', type: String })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiResponse({ status: 200, description: 'HTML blog listing page' })
  async getBlogList(
    @Res() res: Response,
    @Query('lang') lang?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
  ) {
    const locale = ['fr', 'ar', 'en'].includes(lang) ? lang : 'fr';
    try {
      const html = await this.blogSsrService.renderBlogList(locale, {
        category,
        page: page ? parseInt(page, 10) : 1,
      });
      res.status(HttpStatus.OK)
        .type('text/html')
        .set('Cache-Control', 'public, max-age=300')
        .send(html);
    } catch (error) {
      this.logger.error('Error rendering blog list:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('text/html').send(
        '<!DOCTYPE html><html><body><h1>Error loading blog</h1></body></html>',
      );
    }
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Blog detail page (server-rendered HTML)' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  @ApiQuery({ name: 'lang', required: false, description: 'Locale (fr, ar, en)', type: String })
  @ApiResponse({ status: 200, description: 'HTML blog detail page' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getBlogDetail(
    @Param('slug') slug: string,
    @Res() res: Response,
    @Query('lang') lang?: string,
  ) {
    const locale = ['fr', 'ar', 'en'].includes(lang) ? lang : 'fr';
    try {
      const html = await this.blogSsrService.renderBlogDetail(slug, locale);
      if (!html) {
        res.status(HttpStatus.NOT_FOUND).type('text/html').send(
          `<!DOCTYPE html><html lang="${locale}"><head><title>404 | AgroGina Blog</title></head><body style="font-family:sans-serif;text-align:center;padding:4rem;"><h1>Article non trouvé</h1><p>L'article que vous cherchez n'existe pas.</p><a href="/blog?lang=${locale}" style="color:#16a34a;">← Retour au blog</a></body></html>`,
        );
        return;
      }
      res.status(HttpStatus.OK)
        .type('text/html')
        .set('Cache-Control', 'public, max-age=300')
        .send(html);
    } catch (error) {
      this.logger.error(`Error rendering blog detail (${slug}):`, error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('text/html').send(
        '<!DOCTYPE html><html><body><h1>Error loading article</h1></body></html>',
      );
    }
  }
}

import { Controller, Get, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { BlogSsrService } from './blog-ssr.service';

@ApiTags('blog-feeds')
@Controller()
export class BlogFeedsController {
  private readonly logger = new Logger(BlogFeedsController.name);

  constructor(private readonly blogSsrService: BlogSsrService) {}

  @Get('sitemap.xml')
  @Public()
  @ApiOperation({ summary: 'XML Sitemap for blog posts' })
  @ApiResponse({ status: 200, description: 'XML sitemap' })
  async getSitemap(@Res() res: Response) {
    try {
      const xml = await this.blogSsrService.renderSitemap();
      res.status(HttpStatus.OK).type('application/xml').send(xml);
    } catch (error) {
      this.logger.error('Error generating sitemap:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('application/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      );
    }
  }

  @Get('rss.xml')
  @Public()
  @ApiOperation({ summary: 'RSS feed for blog posts' })
  @ApiResponse({ status: 200, description: 'RSS 2.0 feed' })
  async getRss(
    @Res() res: Response,
    @Query('lang') lang?: string,
  ) {
    const locale = ['fr', 'ar', 'en'].includes(lang) ? lang : 'fr';
    try {
      const xml = await this.blogSsrService.renderRss(locale);
      res.status(HttpStatus.OK).type('application/rss+xml').send(xml);
    } catch (error) {
      this.logger.error('Error generating RSS feed:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('application/rss+xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>AgroGina Blog</title></channel></rss>',
      );
    }
  }
}

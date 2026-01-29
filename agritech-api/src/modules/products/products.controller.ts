import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

/**
 * Products controller for serving product images
 * This controller is public (no auth required) since product images should be viewable by anyone
 * but the bucket is private, so we serve through this API
 */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private databaseService: DatabaseService) {}

  @Get('images/:filename')
  @ApiOperation({
    summary: 'Get product image (public endpoint)',
    description: 'Streams product images from private storage bucket. No authentication required.',
  })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async serveProductImage(@Param('filename') filename: string, @Res() res: any) {
    const client = this.databaseService.getAdminClient();

    // Validate filename to prevent path traversal
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._/-]/g, '_');

    this.logger.debug(`Serving product image: ${sanitizedName}`);

    // Create signed URL with short expiry
    const { data, error } = await client.storage
      .from('products')
      .createSignedUrl(sanitizedName, 60); // 1 minute expiry

    if (error) {
      this.logger.warn(`Product image not found: ${sanitizedName} - ${error.message}`);
      throw new NotFoundException(`Product image not found: ${sanitizedName}`);
    }

    // Fetch and stream the image
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new NotFoundException(`Product image not found: ${sanitizedName}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Set caching headers for performance
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // Browser: 1h, CDN: 24h
      res.setHeader('CDN-Cache-Control', 'public, max-age=86400');

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      this.logger.error(`Failed to fetch product image ${sanitizedName}:`, err);
      throw new NotFoundException(`Failed to load product image: ${sanitizedName}`);
    }
  }
}

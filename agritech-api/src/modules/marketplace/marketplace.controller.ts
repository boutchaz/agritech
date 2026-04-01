import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, Request, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { StrapiService } from '../strapi/strapi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

@Controller('marketplace')
export class MarketplaceController {
    constructor(
        private readonly marketplaceService: MarketplaceService,
        private readonly strapiService: StrapiService
    ) { }

    // ==================== PUBLIC ENDPOINTS (no auth) ====================

    /**
     * Get all marketplace categories from CMS
     */
    @Get('categories')
    async getCategories(@Query('locale') locale?: string) {
        return this.strapiService.getMarketplaceCategories(locale);
    }

    /**
     * Get featured categories for homepage
     */
    @Get('categories/featured')
    async getFeaturedCategories(@Query('locale') locale: string = 'fr') {
        return this.strapiService.getFeaturedCategories(locale);
    }

    /**
     * Get a single category by slug
     */
    @Get('categories/:slug')
    async getCategoryBySlug(
        @Param('slug') slug: string,
        @Query('locale') locale: string = 'fr'
    ) {
        const category = await this.strapiService.getMarketplaceCategoryBySlug(slug, locale);
        if (!category) {
            throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
        }
        return category;
    }

    @Get('products')
    async getProducts(@Query() query: GetProductsQueryDto) {
        return this.marketplaceService.getPublicProducts(query);
    }

    @Get('products/:id')
    async getProduct(@Param('id') id: string) {
        const product = await this.marketplaceService.getProduct(id);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }

    // ==================== PROTECTED ENDPOINTS (auth required) ====================

    @Get('dashboard/stats')
    @UseGuards(JwtAuthGuard)
    async getDashboardStats(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
        return this.marketplaceService.getDashboardStats(token, organizationId);
    }

    /**
     * Get seller's own listings
     */
    @Get('my-listings')
    @UseGuards(JwtAuthGuard)
    async getMyListings(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        try {
            return await this.marketplaceService.getMyListings(token);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create a new listing
     */
    @Post('listings')
    @UseGuards(JwtAuthGuard)
    async createListing(@Request() req: any, @Body() body: CreateListingDto) {
        const token = req.headers.authorization?.substring(7);
        try {
            return await this.marketplaceService.createListing(token, body);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Update a listing
     */
    @Patch('listings/:id')
    @UseGuards(JwtAuthGuard)
    async updateListing(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: UpdateListingDto,
    ) {
        const token = req.headers.authorization?.substring(7);
        try {
            return await this.marketplaceService.updateListing(token, id, body);
        } catch (error) {
            if (error.message.includes('Forbidden')) {
                throw new HttpException(error.message, HttpStatus.FORBIDDEN);
            }
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Delete a listing
     */
    @Delete('listings/:id')
    @UseGuards(JwtAuthGuard)
    async deleteListing(@Request() req: any, @Param('id') id: string) {
        const token = req.headers.authorization?.substring(7);
        try {
            return await this.marketplaceService.deleteListing(token, id);
        } catch (error) {
            if (error.message.includes('Forbidden')) {
                throw new HttpException(error.message, HttpStatus.FORBIDDEN);
            }
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
}

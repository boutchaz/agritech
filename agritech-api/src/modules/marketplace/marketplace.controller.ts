import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { StrapiService } from '../strapi/strapi.service';
import { Request } from 'express';

@Controller('marketplace')
export class MarketplaceController {
    constructor(
        private readonly marketplaceService: MarketplaceService,
        private readonly strapiService: StrapiService
    ) { }

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
    async getProducts(@Query('category') category?: string) {
        return this.marketplaceService.getPublicProducts(category);
    }

    @Get('products/:id')
    async getProduct(@Param('id') id: string) {
        const product = await this.marketplaceService.getProduct(id);
        if (!product) {
            throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
        }
        return product;
    }

    @Get('dashboard/stats')
    async getDashboardStats(@Req() request: Request) {
        // Extract token from header
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        const organizationId = request.headers['x-organization-id'] as string;

        // We can rely on the service to use this token to query Supabase securely
        return this.marketplaceService.getDashboardStats(token, organizationId);
    }

    /**
     * Get seller's own listings
     */
    @Get('my-listings')
    async getMyListings(@Req() request: Request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

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
    async createListing(@Req() request: Request, @Body() body: {
        title: string;
        description: string;
        short_description?: string;
        price: number;
        unit: string;
        product_category_id?: string;
        images?: string[];
        quantity_available?: number;
        sku?: string;
    }) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

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
    async updateListing(
        @Req() request: Request,
        @Param('id') id: string,
        @Body() body: Partial<{
            title: string;
            description: string;
            short_description: string;
            price: number;
            unit: string;
            product_category_id: string;
            images: string[];
            quantity_available: number;
            sku: string;
            status: string;
            is_public: boolean;
        }>
    ) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

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
    async deleteListing(@Req() request: Request, @Param('id') id: string) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

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

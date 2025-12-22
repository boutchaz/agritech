import { Controller, Get, Param, Query, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
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
    async getCategories(@Query('locale') locale: string = 'fr') {
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
    async getDashboardStats(@Req() request: Request, @Query('organizationId') organizationId?: string) {
        // Extract token from header
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

        // We can rely on the service to use this token to query Supabase securely
        return this.marketplaceService.getDashboardStats(token, organizationId);
    }
}

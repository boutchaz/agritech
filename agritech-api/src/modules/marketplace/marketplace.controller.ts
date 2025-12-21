import { Controller, Get, Param, Query, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Request } from 'express';

@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

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

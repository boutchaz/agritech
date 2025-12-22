import {
    Controller,
    Get,
    Param,
    Query,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { SellersService } from './sellers.service';

@Controller('marketplace/sellers')
export class SellersController {
    constructor(private readonly sellersService: SellersService) {}

    /**
     * Get list of all sellers (partners)
     * Query params: city, category, search, page, limit
     */
    @Get()
    async getSellers(
        @Query('city') city?: string,
        @Query('category') category?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.sellersService.getSellers({
            city,
            category,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    /**
     * Get list of cities with sellers
     */
    @Get('cities')
    async getSellerCities() {
        return this.sellersService.getSellerCities();
    }

    /**
     * Get seller profile by slug or ID
     */
    @Get(':slug')
    async getSellerBySlug(@Param('slug') slug: string) {
        const seller = await this.sellersService.getSellerBySlug(slug);
        if (!seller) {
            throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
        }
        return seller;
    }

    /**
     * Get seller's products
     */
    @Get(':slug/products')
    async getSellerProducts(
        @Param('slug') slug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const seller = await this.sellersService.getSellerBySlug(slug);
        if (!seller) {
            throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
        }

        return this.sellersService.getSellerProducts(
            seller.id,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20
        );
    }

    /**
     * Get seller's reviews
     */
    @Get(':slug/reviews')
    async getSellerReviews(
        @Param('slug') slug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const seller = await this.sellersService.getSellerBySlug(slug);
        if (!seller) {
            throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
        }

        return this.sellersService.getSellerReviews(
            seller.id,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10
        );
    }
}

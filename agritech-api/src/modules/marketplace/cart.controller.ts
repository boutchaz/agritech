import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Req,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';

@Controller('marketplace/cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    private extractToken(request: Request): string {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        return authHeader.split(' ')[1];
    }

    /**
     * Get user's cart with items and totals
     */
    @Get()
    async getCart(@Req() request: Request) {
        const token = this.extractToken(request);
        return this.cartService.getCart(token);
    }

    /**
     * Add item to cart
     */
    @Post('items')
    async addToCart(@Req() request: Request, @Body() dto: AddToCartDto) {
        const token = this.extractToken(request);
        return this.cartService.addToCart(token, dto);
    }

    /**
     * Update cart item quantity
     */
    @Patch('items/:id')
    async updateCartItem(
        @Req() request: Request,
        @Param('id') id: string,
        @Body() dto: UpdateCartItemDto
    ) {
        const token = this.extractToken(request);
        return this.cartService.updateCartItem(token, id, dto);
    }

    /**
     * Remove item from cart
     */
    @Delete('items/:id')
    async removeFromCart(@Req() request: Request, @Param('id') id: string) {
        const token = this.extractToken(request);
        return this.cartService.removeFromCart(token, id);
    }

    /**
     * Clear entire cart
     */
    @Delete('clear')
    async clearCart(@Req() request: Request) {
        const token = this.extractToken(request);
        return this.cartService.clearCart(token);
    }
}

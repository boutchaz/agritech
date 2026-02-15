import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Request,
    UseGuards,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';

@Controller('marketplace/cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    /**
     * Get user's cart with items and totals
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getCart(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.getCart(token);
    }

    /**
     * Add item to cart
     */
    @Post('items')
    @UseGuards(JwtAuthGuard)
    async addToCart(@Request() req: any, @Body() dto: AddToCartDto) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.addToCart(token, dto);
    }

    /**
     * Update cart item quantity
     */
    @Patch('items/:id')
    @UseGuards(JwtAuthGuard)
    async updateCartItem(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateCartItemDto
    ) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.updateCartItem(token, id, dto);
    }

    /**
     * Remove item from cart
     */
    @Delete('items/:id')
    @UseGuards(JwtAuthGuard)
    async removeFromCart(@Request() req: any, @Param('id') id: string) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.removeFromCart(token, id);
    }

    /**
     * Clear entire cart
     */
    @Delete('clear')
    @UseGuards(JwtAuthGuard)
    async clearCart(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.clearCart(token);
    }
}

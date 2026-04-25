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
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';

@Controller('marketplace/cart')
@RequireModule('marketplace')
@UseGuards(JwtAuthGuard, ModuleEntitlementGuard)
export class CartController {
    constructor(private readonly cartService: CartService) {}

  /**
   * Get user's cart with items and totals
   */
  @Get()
  async getCart(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.getCart(token);
    }

  /**
   * Add item to cart
   */
  @Post('items')
  async addToCart(@Request() req: any, @Body() dto: AddToCartDto) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.addToCart(token, dto);
    }

  /**
   * Update cart item quantity
   */
  @Patch('items/:id')
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
  async removeFromCart(@Request() req: any, @Param('id') id: string) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.removeFromCart(token, id);
    }

  /**
   * Clear entire cart
   */
  @Delete('clear')
  async clearCart(@Request() req: any) {
        const token = req.headers.authorization?.substring(7);
        return this.cartService.clearCart(token);
    }
}

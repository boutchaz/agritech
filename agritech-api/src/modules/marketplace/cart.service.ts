import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    private getAdminClient() {
        return this.databaseService.getAdminClient();
    }

    private getJwtSecret(): string | undefined {
        return this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');
    }

    private async resolveUserOrg(token: string): Promise<{ userId: string; organizationId: string | null }> {
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
            secret: this.getJwtSecret(),
        });
        const userId = payload.sub;

        const { data: userData } = await this.getAdminClient()
            .from('auth_users_view')
            .select('organization_id')
            .eq('id', userId)
            .single();

        return { userId, organizationId: userData?.organization_id ?? null };
    }

    async getOrCreateCartForUser(userId: string, organizationId: string | null) {
        const adminClient = this.getAdminClient();

        const { data: existingCart } = await adminClient
            .from('marketplace_carts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existingCart) {
            return existingCart;
        }

        const { data: newCart, error: createError } = await adminClient
            .from('marketplace_carts')
            .insert({
                user_id: userId,
                organization_id: organizationId,
            })
            .select()
            .single();

        if (createError) {
            this.logger.error(`Failed to create cart: ${createError.message}`);
            throw new HttpException('Failed to create cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return newCart;
    }

    async getCartForUser(userId: string) {
        const adminClient = this.getAdminClient();

        const { data: cart, error: cartError } = await adminClient
            .from('marketplace_carts')
            .select(`
                *,
                items:marketplace_cart_items(
                    id,
                    listing_id,
                    item_id,
                    seller_organization_id,
                    title,
                    quantity,
                    unit_price,
                    unit,
                    image_url,
                    created_at,
                    updated_at
                )
            `)
            .eq('user_id', userId)
            .single();

        if (cartError && cartError.code !== 'PGRST116') {
            this.logger.error(`Failed to get cart: ${cartError.message}`);
            throw new HttpException('Failed to get cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!cart) {
            return {
                id: null,
                user_id: userId,
                items: [],
                total: 0,
                item_count: 0,
            };
        }

        const items = cart.items || [];
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);

        return {
            ...cart,
            total,
            item_count: itemCount,
        };
    }

    async clearCartForUser(userId: string) {
        const adminClient = this.getAdminClient();

        const { data: cart, error: cartError } = await adminClient
            .from('marketplace_carts')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (cartError || !cart) {
            return { message: 'Cart cleared', items: [], total: 0, item_count: 0 };
        }

        const { error: deleteError } = await adminClient
            .from('marketplace_cart_items')
            .delete()
            .eq('cart_id', cart.id);

        if (deleteError) {
            this.logger.error(`Failed to clear cart: ${deleteError.message}`);
            throw new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return { message: 'Cart cleared', items: [], total: 0, item_count: 0 };
    }

    /**
     * Get or create a cart for the authenticated user
     */
    async getOrCreateCart(token: string) {
        const { userId, organizationId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return this.getOrCreateCartForUser(userId, organizationId);
    }

    /**
     * Get user's cart with items
     */
    async getCart(token: string) {
        const { userId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return this.getCartForUser(userId);
    }

    /**
     * Add item to cart
     */
    async addToCart(token: string, dto: AddToCartDto) {
        const adminSupabase = this.getAdminClient();

        // Validate that at least one ID is provided
        if (!dto.listing_id && !dto.item_id) {
            throw new HttpException('Either listing_id or item_id is required', HttpStatus.BAD_REQUEST);
        }

        const { userId, organizationId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Get or create cart
        const cart = await this.getOrCreateCartForUser(userId, organizationId);

        // Fetch product details based on source
        let productData: {
            title: string;
            unit_price: number;
            unit: string;
            image_url: string | null;
            seller_organization_id: string;
        };

        if (dto.listing_id) {
            // Fetch from marketplace_listings
            const { data: listing, error } = await adminSupabase
                .from('marketplace_listings')
                .select('*')
                .eq('id', dto.listing_id)
                .single();

            if (error || !listing) {
                throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
            }

            // Check stock availability for listing
            if (listing.quantity_available < dto.quantity) {
                throw new HttpException(
                    `Insufficient stock. Available: ${listing.quantity_available} ${listing.unit || 'units'}`,
                    HttpStatus.BAD_REQUEST
                );
            }

            productData = {
                title: listing.title,
                unit_price: listing.price,
                unit: listing.unit || 'unit',
                image_url: listing.images?.[0] || null,
                seller_organization_id: listing.organization_id,
            };
        } else {
            // Fetch from items table
            const { data: item, error } = await adminSupabase
                .from('items')
                .select('*')
                .eq('id', dto.item_id)
                .eq('is_sales_item', true)
                .eq('is_active', true)
                .eq('show_in_website', true)
                .single();

            if (error || !item) {
                throw new HttpException('Item not found or not available for sale', HttpStatus.NOT_FOUND);
            }

            // Check stock availability for inventory item (sum of all stock valuation batches)
            const { data: stockData } = await adminSupabase
                .from('stock_valuation')
                .select('remaining_quantity')
                .eq('item_id', dto.item_id)
                .eq('organization_id', item.organization_id);

            const availableStock = stockData?.reduce((sum, batch) => sum + (batch.remaining_quantity || 0), 0) || 0;

            if (availableStock < dto.quantity) {
                throw new HttpException(
                    `Insufficient stock. Available: ${availableStock} ${item.default_unit || 'units'}`,
                    HttpStatus.BAD_REQUEST
                );
            }

            productData = {
                title: item.item_name,
                unit_price: item.standard_rate || 0,
                unit: item.default_unit || 'unit',
                image_url: item.images?.[0] || item.image_url || null,
                seller_organization_id: item.organization_id,
            };
        }

        // Check if item already exists in cart
        const existingItemQuery = adminSupabase
            .from('marketplace_cart_items')
            .select('*')
            .eq('cart_id', cart.id)
            .eq('cart.user_id', userId);

        if (dto.listing_id) {
            existingItemQuery.eq('listing_id', dto.listing_id);
        } else {
            existingItemQuery.eq('item_id', dto.item_id);
        }

        const { data: existingItem } = await existingItemQuery.single();

        if (existingItem) {
            // Update quantity
            const newQuantity = Number(existingItem.quantity) + dto.quantity;
            const { data: updated, error: updateError } = await adminSupabase
                .from('marketplace_cart_items')
                .update({
                    quantity: newQuantity,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingItem.id)
                .select()
                .single();

            if (updateError) {
                this.logger.error(`Failed to update cart item: ${updateError.message}`);
                throw new HttpException('Failed to update cart', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            return this.getCartForUser(userId);
        }

        // Add new item to cart
        const { error: insertError } = await adminSupabase
            .from('marketplace_cart_items')
            .insert({
                cart_id: cart.id,
                listing_id: dto.listing_id || null,
                item_id: dto.item_id || null,
                seller_organization_id: productData.seller_organization_id,
                title: productData.title,
                quantity: dto.quantity,
                unit_price: productData.unit_price,
                unit: productData.unit,
                image_url: productData.image_url,
            });

        if (insertError) {
            this.logger.error(`Failed to add to cart: ${insertError.message}`);
            throw new HttpException('Failed to add to cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.getCartForUser(userId);
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(token: string, cartItemId: string, dto: UpdateCartItemDto) {
        const adminSupabase = this.getAdminClient();
        const { userId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Verify item belongs to user's cart
        const { data: cartItem, error: findError } = await adminSupabase
            .from('marketplace_cart_items')
            .select(`
                *,
                cart:marketplace_carts!inner(user_id)
            `)
            .eq('id', cartItemId)
            .eq('cart.user_id', userId)
            .single();

        if (findError || !cartItem) {
            throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
        }

        if (cartItem.cart.user_id !== userId) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        // Validate stock availability before updating
        if (cartItem.listing_id) {
            // Check marketplace listing stock
            const { data: listing } = await adminSupabase
                .from('marketplace_listings')
                .select('quantity_available, unit')
                .eq('id', cartItem.listing_id)
                .single();

            if (listing && listing.quantity_available < dto.quantity) {
                throw new HttpException(
                    `Insufficient stock. Available: ${listing.quantity_available} ${listing.unit || 'units'}`,
                    HttpStatus.BAD_REQUEST
                );
            }
        } else if (cartItem.item_id) {
            // Check inventory item stock
            const { data: stockData } = await adminSupabase
                .from('stock_valuation')
                .select('remaining_quantity')
                .eq('item_id', cartItem.item_id)
                .eq('organization_id', cartItem.seller_organization_id);

            const availableStock = stockData?.reduce((sum, batch) => sum + (batch.remaining_quantity || 0), 0) || 0;

            if (availableStock < dto.quantity) {
                const { data: item } = await adminSupabase
                    .from('items')
                    .select('default_unit')
                    .eq('id', cartItem.item_id)
                    .single();

                throw new HttpException(
                    `Insufficient stock. Available: ${availableStock} ${item?.default_unit || 'units'}`,
                    HttpStatus.BAD_REQUEST
                );
            }
        }

        // Update quantity
        const { error: updateError } = await adminSupabase
            .from('marketplace_cart_items')
            .update({
                quantity: dto.quantity,
                updated_at: new Date().toISOString(),
            })
            .eq('id', cartItemId);

        if (updateError) {
            this.logger.error(`Failed to update cart item: ${updateError.message}`);
            throw new HttpException('Failed to update cart item', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.getCartForUser(userId);
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(token: string, cartItemId: string) {
        const adminSupabase = this.getAdminClient();
        const { userId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Verify item belongs to user's cart
        const { data: cartItem, error: findError } = await adminSupabase
            .from('marketplace_cart_items')
            .select(`
                *,
                cart:marketplace_carts!inner(user_id)
            `)
            .eq('id', cartItemId)
            .eq('cart.user_id', userId)
            .single();

        if (findError || !cartItem) {
            throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
        }

        if (cartItem.cart.user_id !== userId) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        // Delete item
        const { error: deleteError } = await adminSupabase
            .from('marketplace_cart_items')
            .delete()
            .eq('id', cartItemId);

        if (deleteError) {
            this.logger.error(`Failed to remove cart item: ${deleteError.message}`);
            throw new HttpException('Failed to remove item from cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.getCartForUser(userId);
    }

    /**
     * Clear entire cart
     */
    async clearCart(token: string) {
        const { userId } = await this.resolveUserOrg(token);
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return this.clearCartForUser(userId);
    }
}

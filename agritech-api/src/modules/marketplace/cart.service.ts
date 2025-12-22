import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Get or create a cart for the authenticated user
     */
    async getOrCreateCart(token: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Get user's organization
        const { data: userData } = await supabase
            .from('auth_users_view')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        // Check for existing cart
        const { data: existingCart, error: cartError } = await supabase
            .from('marketplace_carts')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (existingCart) {
            return existingCart;
        }

        // Create new cart
        const { data: newCart, error: createError } = await supabase
            .from('marketplace_carts')
            .insert({
                user_id: user.id,
                organization_id: userData?.organization_id || null,
            })
            .select()
            .single();

        if (createError) {
            this.logger.error(`Failed to create cart: ${createError.message}`);
            throw new HttpException('Failed to create cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return newCart;
    }

    /**
     * Get user's cart with items
     */
    async getCart(token: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Get cart with items
        const { data: cart, error: cartError } = await supabase
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
            .eq('user_id', user.id)
            .single();

        if (cartError && cartError.code !== 'PGRST116') {
            this.logger.error(`Failed to get cart: ${cartError.message}`);
            throw new HttpException('Failed to get cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!cart) {
            // Return empty cart structure
            return {
                id: null,
                user_id: user.id,
                items: [],
                total: 0,
                item_count: 0,
            };
        }

        // Calculate totals
        const items = cart.items || [];
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);

        return {
            ...cart,
            total,
            item_count: itemCount,
        };
    }

    /**
     * Add item to cart
     */
    async addToCart(token: string, dto: AddToCartDto) {
        const supabase = this.databaseService.getClientWithAuth(token);

        // Validate that at least one ID is provided
        if (!dto.listing_id && !dto.item_id) {
            throw new HttpException('Either listing_id or item_id is required', HttpStatus.BAD_REQUEST);
        }

        // Get or create cart
        const cart = await this.getOrCreateCart(token);

        // Fetch product details based on source
        let productData: {
            title: string;
            unit_price: number;
            unit: string;
            image_url: string | null;
            seller_organization_id: string;
        };

        const adminSupabase = this.databaseService.getAdminClient();

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

            productData = {
                title: item.item_name,
                unit_price: item.standard_rate || 0,
                unit: item.default_unit || 'unit',
                image_url: item.images?.[0] || item.image_url || null,
                seller_organization_id: item.organization_id,
            };
        }

        // Check if item already exists in cart
        const existingItemQuery = supabase
            .from('marketplace_cart_items')
            .select('*')
            .eq('cart_id', cart.id);

        if (dto.listing_id) {
            existingItemQuery.eq('listing_id', dto.listing_id);
        } else {
            existingItemQuery.eq('item_id', dto.item_id);
        }

        const { data: existingItem } = await existingItemQuery.single();

        if (existingItem) {
            // Update quantity
            const newQuantity = Number(existingItem.quantity) + dto.quantity;
            const { data: updated, error: updateError } = await supabase
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

            return this.getCart(token);
        }

        // Add new item to cart
        const { error: insertError } = await supabase
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

        return this.getCart(token);
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(token: string, cartItemId: string, dto: UpdateCartItemDto) {
        const supabase = this.databaseService.getClientWithAuth(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Verify item belongs to user's cart
        const { data: cartItem, error: findError } = await supabase
            .from('marketplace_cart_items')
            .select(`
                *,
                cart:marketplace_carts!inner(user_id)
            `)
            .eq('id', cartItemId)
            .single();

        if (findError || !cartItem) {
            throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
        }

        if (cartItem.cart.user_id !== user.id) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        // Update quantity
        const { error: updateError } = await supabase
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

        return this.getCart(token);
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(token: string, cartItemId: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Verify item belongs to user's cart
        const { data: cartItem, error: findError } = await supabase
            .from('marketplace_cart_items')
            .select(`
                *,
                cart:marketplace_carts!inner(user_id)
            `)
            .eq('id', cartItemId)
            .single();

        if (findError || !cartItem) {
            throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);
        }

        if (cartItem.cart.user_id !== user.id) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        // Delete item
        const { error: deleteError } = await supabase
            .from('marketplace_cart_items')
            .delete()
            .eq('id', cartItemId);

        if (deleteError) {
            this.logger.error(`Failed to remove cart item: ${deleteError.message}`);
            throw new HttpException('Failed to remove item from cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.getCart(token);
    }

    /**
     * Clear entire cart
     */
    async clearCart(token: string) {
        const supabase = this.databaseService.getClientWithAuth(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        // Get user's cart
        const { data: cart, error: cartError } = await supabase
            .from('marketplace_carts')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (cartError || !cart) {
            // No cart to clear
            return { message: 'Cart cleared', items: [], total: 0, item_count: 0 };
        }

        // Delete all items in cart
        const { error: deleteError } = await supabase
            .from('marketplace_cart_items')
            .delete()
            .eq('cart_id', cart.id);

        if (deleteError) {
            this.logger.error(`Failed to clear cart: ${deleteError.message}`);
            throw new HttpException('Failed to clear cart', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return { message: 'Cart cleared', items: [], total: 0, item_count: 0 };
    }
}

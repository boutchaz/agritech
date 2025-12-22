import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { CartService } from './cart.service';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cartService: CartService
    ) {}

    /**
     * Create an order from the user's cart
     */
    async createOrder(token: string, dto: CreateOrderDto) {
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

        if (!userData?.organization_id) {
            throw new HttpException('User must belong to an organization', HttpStatus.BAD_REQUEST);
        }

        // Get user's cart with items
        const cart = await this.cartService.getCart(token);

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new HttpException('Cart is empty', HttpStatus.BAD_REQUEST);
        }

        // Group cart items by seller
        const itemsBySeller: Map<string, typeof cart.items> = new Map();
        for (const item of cart.items) {
            const sellerId = item.seller_organization_id;
            if (!itemsBySeller.has(sellerId)) {
                itemsBySeller.set(sellerId, []);
            }
            itemsBySeller.get(sellerId)!.push(item);
        }

        // Create one order per seller
        const orders = [];

        for (const [sellerOrgId, items] of itemsBySeller) {
            const orderTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            // Create order
            const { data: order, error: orderError } = await supabase
                .from('marketplace_orders')
                .insert({
                    buyer_organization_id: userData.organization_id,
                    seller_organization_id: sellerOrgId,
                    status: 'pending',
                    total_amount: orderTotal,
                    currency: 'MAD',
                    shipping_details: dto.shipping_details,
                    payment_method: dto.payment_method,
                    payment_status: dto.payment_method === 'cod' ? 'pending' : 'pending',
                    buyer_name: dto.shipping_details.name,
                    buyer_phone: dto.shipping_details.phone,
                    buyer_email: dto.shipping_details.email || null,
                    notes: dto.notes || null,
                })
                .select()
                .single();

            if (orderError) {
                this.logger.error(`Failed to create order: ${orderError.message}`);
                throw new HttpException('Failed to create order', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Create order items
            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.listing_id || item.item_id,
                product_type: item.listing_id ? 'listing' : 'item',
                title: item.title,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit || null,
                image_url: item.image_url || null,
            }));

            const { error: itemsError } = await supabase
                .from('marketplace_order_items')
                .insert(orderItems);

            if (itemsError) {
                this.logger.error(`Failed to create order items: ${itemsError.message}`);
                // Rollback order
                await supabase.from('marketplace_orders').delete().eq('id', order.id);
                throw new HttpException('Failed to create order items', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            orders.push({
                ...order,
                items: orderItems,
            });
        }

        // Clear the cart after successful order creation
        await this.cartService.clearCart(token);

        return orders.length === 1 ? orders[0] : orders;
    }

    /**
     * Get orders for the current user (both as buyer and seller)
     */
    async getOrders(token: string, role?: 'buyer' | 'seller') {
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

        if (!userData?.organization_id) {
            return [];
        }

        let query = supabase
            .from('marketplace_orders')
            .select(`
                *,
                items:marketplace_order_items(*)
            `)
            .order('created_at', { ascending: false });

        if (role === 'buyer') {
            query = query.eq('buyer_organization_id', userData.organization_id);
        } else if (role === 'seller') {
            query = query.eq('seller_organization_id', userData.organization_id);
        } else {
            // Get both buyer and seller orders
            query = query.or(`buyer_organization_id.eq.${userData.organization_id},seller_organization_id.eq.${userData.organization_id}`);
        }

        const { data: orders, error: ordersError } = await query;

        if (ordersError) {
            this.logger.error(`Failed to fetch orders: ${ordersError.message}`);
            throw new HttpException('Failed to fetch orders', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return orders || [];
    }

    /**
     * Get a single order by ID
     */
    async getOrder(token: string, orderId: string) {
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

        const { data: order, error: orderError } = await supabase
            .from('marketplace_orders')
            .select(`
                *,
                items:marketplace_order_items(*),
                buyer:organizations!marketplace_orders_buyer_organization_id_fkey(id, name),
                seller:organizations!marketplace_orders_seller_organization_id_fkey(id, name)
            `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
        }

        // Check if user is buyer or seller
        if (order.buyer_organization_id !== userData?.organization_id &&
            order.seller_organization_id !== userData?.organization_id) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        return order;
    }

    /**
     * Update order status (for sellers)
     */
    async updateOrderStatus(token: string, orderId: string, dto: UpdateOrderStatusDto) {
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

        // Get the order
        const { data: order, error: orderError } = await supabase
            .from('marketplace_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
        }

        // Check if user is the seller
        if (order.seller_organization_id !== userData?.organization_id) {
            throw new HttpException('Only sellers can update order status', HttpStatus.FORBIDDEN);
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: [],
            disputed: ['cancelled'],
        };

        if (!validTransitions[order.status]?.includes(dto.status)) {
            throw new HttpException(`Cannot transition from ${order.status} to ${dto.status}`, HttpStatus.BAD_REQUEST);
        }

        // Update the order
        const { data: updated, error: updateError } = await supabase
            .from('marketplace_orders')
            .update({
                status: dto.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (updateError) {
            this.logger.error(`Failed to update order status: ${updateError.message}`);
            throw new HttpException('Failed to update order', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return updated;
    }

    /**
     * Cancel an order (for buyers)
     */
    async cancelOrder(token: string, orderId: string) {
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

        // Get the order
        const { data: order, error: orderError } = await supabase
            .from('marketplace_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
        }

        // Check if user is the buyer
        if (order.buyer_organization_id !== userData?.organization_id) {
            throw new HttpException('Only buyers can cancel orders', HttpStatus.FORBIDDEN);
        }

        // Can only cancel pending or confirmed orders
        if (!['pending', 'confirmed'].includes(order.status)) {
            throw new HttpException(`Cannot cancel order with status ${order.status}`, HttpStatus.BAD_REQUEST);
        }

        // Update the order
        const { data: updated, error: updateError } = await supabase
            .from('marketplace_orders')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (updateError) {
            this.logger.error(`Failed to cancel order: ${updateError.message}`);
            throw new HttpException('Failed to cancel order', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return updated;
    }
}

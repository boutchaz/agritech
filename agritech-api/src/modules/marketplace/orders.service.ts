import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { CartService } from './cart.service';
import { NotificationsService } from '../notifications/notifications.service';

type MarketplaceCartItem = {
    listing_id?: string | null;
    item_id?: string | null;
    seller_organization_id: string;
    title: string;
    quantity: number;
    unit_price: number;
    unit?: string | null;
    image_url?: string | null;
};

type MarketplaceEmailItem = {
    title: string;
    quantity: number;
    unit_price: number;
    unit: string | null;
};

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cartService: CartService,
        private readonly notificationsService: NotificationsService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    private getMarketplaceUrl(): string {
        return (
            this.configService.get<string>('MARKETPLACE_URL') ||
            'https://marketplace.thebzlab.online'
        );
    }

    private async resolveUserOrg(token: string): Promise<{ userId: string; organizationId: string | null }> {
        const secret = this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, { secret });
        const userId = payload.sub;

        const { data: userData } = await this.databaseService.getAdminClient()
            .from('auth_users_view')
            .select('organization_id')
            .eq('id', userId)
            .single();

        return { userId, organizationId: userData?.organization_id ?? null };
    }

    /**
     * Atomically deduct stock using a conditional UPDATE with WHERE guard.
     * The WHERE clause `quantity_available >= quantity` prevents overselling
     * even under concurrent requests. If 0 rows are affected, stock was insufficient.
     */
    private async deductMarketplaceListingStock(
        _supabase: any,
        listingId: string,
        quantity: number
    ): Promise<void> {
        const pool = this.databaseService.getPgPool();
        const result = await pool.query(
            `UPDATE marketplace_listings
             SET quantity_available = quantity_available - $1,
                 updated_at = NOW()
             WHERE id = $2 AND quantity_available >= $1
             RETURNING id, quantity_available`,
            [quantity, listingId],
        );

        if (result.rowCount === 0) {
            // Distinguish "not found" from "insufficient stock"
            const check = await pool.query(
                `SELECT quantity_available FROM marketplace_listings WHERE id = $1`,
                [listingId],
            );
            if (check.rowCount === 0) {
                throw new Error(`Listing not found: ${listingId}`);
            }
            throw new Error('Insufficient stock available');
        }
    }

    /**
     * Atomically restore stock using SQL addition to prevent double-restore
     * under concurrent cancellations.
     */
    private async restoreMarketplaceListingStock(
        _supabase: any,
        listingId: string,
        quantity: number
    ): Promise<void> {
        try {
            const pool = this.databaseService.getPgPool();
            const result = await pool.query(
                `UPDATE marketplace_listings
                 SET quantity_available = quantity_available + $1,
                     updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, quantity_available`,
                [quantity, listingId],
            );

            if (result.rowCount === 0) {
                this.logger.error(`Failed to find listing for stock restore: ${listingId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to restore stock for listing ${listingId}: ${error.message}`);
        }
    }

    async createOrder(token: string, dto: CreateOrderDto) {
        const { userId, organizationId } = await this.resolveUserOrg(token);
        const supabase = this.databaseService.getAdminClient();

        if (!organizationId) {
            throw new HttpException('User must belong to an organization', HttpStatus.BAD_REQUEST);
        }

        const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        // Get user's cart with items
        const cart = await this.cartService.getCart(token);

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new HttpException('Cart is empty', HttpStatus.BAD_REQUEST);
        }

        // Group cart items by seller
        const cartItems: MarketplaceCartItem[] = cart.items;
        const itemsBySeller = new Map<string, MarketplaceCartItem[]>();
        for (const item of cartItems) {
            const sellerId = item.seller_organization_id;
            if (!itemsBySeller.has(sellerId)) {
                itemsBySeller.set(sellerId, []);
            }
            itemsBySeller.get(sellerId)!.push(item);
        }

        // Create one order per seller
        const orders = [];

        for (const [sellerOrgId, items] of itemsBySeller) {
            const orderTotal = items.reduce((sum: number, item: MarketplaceCartItem) => sum + (item.quantity * item.unit_price), 0);

            // Create order
            const { data: order, error: orderError } = await supabase
                .from('marketplace_orders')
                .insert({
                    buyer_organization_id: organizationId,
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
            const orderItems = items.map((item: MarketplaceCartItem) => ({
                order_id: order.id,
                listing_id: item.listing_id || null,
                item_id: item.item_id || null,
                product_type: item.listing_id ? 'listing' : 'item',
                title: item.title,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit || null,
                image_url: item.image_url || null,
                stock_deducted: false, // Will be updated after deduction
            }));

            const { data: createdItems, error: itemsError } = await supabase
                .from('marketplace_order_items')
                .insert(orderItems)
                .select();

            if (itemsError) {
                this.logger.error(`Failed to create order items: ${itemsError.message}`);
                // Rollback order
                await supabase
                    .from('marketplace_orders')
                    .delete()
                    .eq('id', order.id)
                    .eq('buyer_organization_id', organizationId);
                throw new HttpException('Failed to create order items', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Deduct stock for each order item
            for (const [, orderItem] of createdItems.entries()) {
                try {
                    if (orderItem.product_type === 'listing' && orderItem.listing_id) {
                        await this.deductMarketplaceListingStock(
                            supabase,
                            orderItem.listing_id,
                            orderItem.quantity
                        );

                        await supabase
                            .from('marketplace_order_items')
                            .update({ stock_deducted: true })
                            .eq('id', orderItem.id);

                    } else if (orderItem.product_type === 'item' && orderItem.item_id) {
                        // For inventory items, create a stock movement (OUT)
                        // Get the first available warehouse for this item
                        const { data: itemStock } = await supabase
                            .from('stock_valuation')
                            .select('warehouse_id, remaining_quantity, cost_per_unit, item_id')
                            .eq('item_id', orderItem.item_id)
                            .gt('remaining_quantity', 0)
                            .order('valuation_date', { ascending: true }) // FIFO
                            .limit(1)
                            .single();

                        if (!itemStock || itemStock.remaining_quantity < orderItem.quantity) {
                            this.logger.error(`Insufficient inventory stock for item ${orderItem.item_id}`);
                            throw new Error(`Insufficient stock for ${orderItem.title}`);
                        }

                        // Create stock movement (OUT)
                        const { data: movement, error: movementError } = await supabase
                            .from('stock_movements')
                            .insert({
                                organization_id: sellerOrgId,
                                movement_type: 'OUT',
                                movement_date: new Date().toISOString(),
                                item_id: orderItem.item_id,
                                warehouse_id: itemStock.warehouse_id,
                                quantity: -orderItem.quantity, // Negative for OUT
                                unit: orderItem.unit || 'kg',
                                balance_quantity: itemStock.remaining_quantity - orderItem.quantity,
                                cost_per_unit: itemStock.cost_per_unit,
                                total_cost: orderItem.quantity * itemStock.cost_per_unit,
                                marketplace_order_item_id: orderItem.id,
                            })
                            .select()
                            .single();

                        if (movementError) {
                            this.logger.error(`Failed to create stock movement: ${movementError.message}`);
                            throw new Error(`Failed to deduct inventory for ${orderItem.title}`);
                        }

                        // Update stock_valuation remaining_quantity
                        await supabase
                            .from('stock_valuation')
                            .update({
                                remaining_quantity: itemStock.remaining_quantity - orderItem.quantity,
                            })
                            .eq('item_id', orderItem.item_id)
                            .eq('warehouse_id', itemStock.warehouse_id);

                        // Mark as deducted and link to movement
                        await supabase
                            .from('marketplace_order_items')
                            .update({
                                stock_deducted: true,
                                stock_movement_id: movement.id,
                            })
                            .eq('id', orderItem.id);
                    }
                } catch (stockError) {
                    this.logger.error(`Stock deduction failed for order ${order.id}, item ${orderItem.id}: ${stockError.message}`);
                    // Rollback: Delete order and all items
                    await supabase
                        .from('marketplace_orders')
                        .delete()
                        .eq('id', order.id)
                        .eq('buyer_organization_id', organizationId);
                    throw new HttpException(
                        stockError.message || 'Failed to deduct stock',
                        HttpStatus.BAD_REQUEST
                    );
                }
            }

            // Send email notifications
            try {
                // Get seller organization details
                const { data: sellerOrg } = await supabase
                    .from('organizations')
                    .select('name, email')
                    .eq('id', sellerOrgId)
                    .single();

                const buyerEmail = dto.shipping_details.email || userProfile?.email;
                const shippingAddress = `${dto.shipping_details.address}, ${dto.shipping_details.city}${dto.shipping_details.postal_code ? ', ' + dto.shipping_details.postal_code : ''}`;

                const emailData = {
                    orderNumber: order.id,
                    buyerName: dto.shipping_details.name,
                    buyerEmail,
                    sellerName: sellerOrg?.name || 'Vendeur',
                    totalAmount: orderTotal,
                    currency: 'MAD',
                    items: orderItems.map((item: MarketplaceEmailItem) => ({
                        title: item.title,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                        unit: item.unit
                    })),
                    shippingAddress,
                    orderUrl: `${this.getMarketplaceUrl()}/orders/${order.id}`
                };

                // Send confirmation email to buyer
                await this.notificationsService.sendOrderConfirmationEmail(emailData);

                // Send new order notification to seller (if seller has email)
                if (sellerOrg?.email) {
                    await this.notificationsService.sendNewOrderNotificationToSeller(
                        sellerOrg.email,
                        emailData
                    );
                }
            } catch (emailError) {
                // Log email errors but don't fail the order creation
                this.logger.error(`Failed to send order emails: ${emailError.message}`);
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
        const { organizationId } = await this.resolveUserOrg(token);
        const supabase = this.databaseService.getAdminClient();

        if (!organizationId) {
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
            query = query.eq('buyer_organization_id', organizationId);
        } else if (role === 'seller') {
            query = query.eq('seller_organization_id', organizationId);
        } else {
            // Get both buyer and seller orders
            query = query.or(`buyer_organization_id.eq.${organizationId},seller_organization_id.eq.${organizationId}`);
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
        const { organizationId } = await this.resolveUserOrg(token);
        const supabase = this.databaseService.getAdminClient();

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
        if (order.buyer_organization_id !== organizationId &&
            order.seller_organization_id !== organizationId) {
            throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }

        return order;
    }

    /**
     * Update order status (for sellers)
     */
    async updateOrderStatus(token: string, orderId: string, dto: UpdateOrderStatusDto) {
        const { userId, organizationId } = await this.resolveUserOrg(token);
        const supabase = this.databaseService.getAdminClient();

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
        if (order.seller_organization_id !== organizationId) {
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

        // Send email notification to buyer about status update
        try {
            // Get order items
            const { data: orderItems } = await supabase
                .from('marketplace_order_items')
                .select('*')
                .eq('order_id', orderId);

            // Get seller organization name
            const { data: sellerOrg } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', order.seller_organization_id)
                .single();

            const { data: userProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

            const buyerEmail = updated.buyer_email || userProfile?.email;
            const shippingAddress = updated.shipping_details
                ? `${updated.shipping_details.address}, ${updated.shipping_details.city}${updated.shipping_details.postal_code ? ', ' + updated.shipping_details.postal_code : ''}`
                : '';

            const emailData = {
                orderNumber: updated.id,
                buyerName: updated.buyer_name,
                buyerEmail,
                sellerName: sellerOrg?.name || 'Vendeur',
                totalAmount: updated.total_amount,
                currency: updated.currency,
                items: orderItems?.map((item: MarketplaceEmailItem) => ({
                    title: item.title,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    unit: item.unit
                })) || [],
                shippingAddress,
                orderUrl: `${this.getMarketplaceUrl()}/orders/${updated.id}`,
                status: dto.status
            };

            await this.notificationsService.sendOrderStatusUpdateEmail(emailData);
        } catch (emailError) {
            // Log email errors but don't fail the status update
            this.logger.error(`Failed to send status update email: ${emailError.message}`);
        }

        // Send in-app notification to buyer if they have a user account
        try {
            if (order.buyer_user_id) {
                await this.notificationsService.notifyOrderStatusChange(
                    order.buyer_user_id,
                    order.buyer_organization_id,
                    updated.id.substring(0, 8).toUpperCase(),
                    updated.id,
                    dto.status,
                );
                this.logger.log(`Order status notification sent to buyer ${order.buyer_user_id}`);
            }
        } catch (notifError) {
            this.logger.warn(`Failed to send order status notification: ${notifError.message}`);
        }

        return updated;
    }

    /**
     * Cancel an order (for buyers)
     */
    async cancelOrder(token: string, orderId: string) {
        const { userId, organizationId } = await this.resolveUserOrg(token);
        const supabase = this.databaseService.getAdminClient();

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
        if (order.buyer_organization_id !== organizationId) {
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

        // Restore stock for cancelled order
        const { data: orderItems } = await supabase
            .from('marketplace_order_items')
            .select('*')
            .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
            for (const orderItem of orderItems) {
                try {
                    if (orderItem.stock_deducted) {
                        if (orderItem.product_type === 'listing' && orderItem.listing_id) {
                            await this.restoreMarketplaceListingStock(
                                supabase,
                                orderItem.listing_id,
                                orderItem.quantity
                            );

                            await supabase
                                .from('marketplace_order_items')
                                .update({ stock_deducted: false })
                                .eq('id', orderItem.id);

                        } else if (orderItem.product_type === 'item' && orderItem.item_id && orderItem.stock_movement_id) {
                            // For inventory items, create a reverse stock movement (IN)
                            const { data: originalMovement } = await supabase
                                .from('stock_movements')
                                .select('*')
                                .eq('id', orderItem.stock_movement_id)
                                .single();

                            if (originalMovement) {
                                // Create reverse movement (IN)
                                await supabase
                                    .from('stock_movements')
                                    .insert({
                                        organization_id: originalMovement.organization_id,
                                        movement_type: 'IN',
                                        movement_date: new Date().toISOString(),
                                        item_id: originalMovement.item_id,
                                        warehouse_id: originalMovement.warehouse_id,
                                        quantity: orderItem.quantity, // Positive for IN
                                        unit: originalMovement.unit,
                                        balance_quantity: originalMovement.balance_quantity + orderItem.quantity,
                                        cost_per_unit: originalMovement.cost_per_unit,
                                        total_cost: orderItem.quantity * originalMovement.cost_per_unit,
                                        marketplace_order_item_id: orderItem.id,
                                    });

                                // Restore stock_valuation remaining_quantity
                                // First, get current stock valuation
                                const { data: currentStock } = await supabase
                                    .from('stock_valuation')
                                    .select('remaining_quantity')
                                    .eq('item_id', orderItem.item_id)
                                    .eq('warehouse_id', originalMovement.warehouse_id)
                                    .single();

                                if (currentStock) {
                                    await supabase
                                        .from('stock_valuation')
                                        .update({
                                            remaining_quantity: currentStock.remaining_quantity + orderItem.quantity,
                                        })
                                        .eq('item_id', orderItem.item_id)
                                        .eq('warehouse_id', originalMovement.warehouse_id);
                                }

                                // Mark as not deducted
                                await supabase
                                    .from('marketplace_order_items')
                                    .update({ stock_deducted: false })
                                    .eq('id', orderItem.id);
                            }
                        }
                    }
                } catch (stockError) {
                    // Log but don't fail the cancellation
                    this.logger.error(`Failed to restore stock for item ${orderItem.id}: ${stockError.message}`);
                }
            }
        }

        // Send email notification to buyer about cancellation
        try {
            // Get order items
            const { data: orderItems } = await supabase
                .from('marketplace_order_items')
                .select('*')
                .eq('order_id', orderId);

            // Get seller organization name
            const { data: sellerOrg } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', order.seller_organization_id)
                .single();

            const { data: userProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

            const buyerEmail = updated.buyer_email || userProfile?.email;
            const shippingAddress = updated.shipping_details
                ? `${updated.shipping_details.address}, ${updated.shipping_details.city}${updated.shipping_details.postal_code ? ', ' + updated.shipping_details.postal_code : ''}`
                : '';

            const emailData = {
                orderNumber: updated.id,
                buyerName: updated.buyer_name,
                buyerEmail,
                sellerName: sellerOrg?.name || 'Vendeur',
                totalAmount: updated.total_amount,
                currency: updated.currency,
                items: orderItems?.map((item: MarketplaceEmailItem) => ({
                    title: item.title,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    unit: item.unit
                })) || [],
                shippingAddress,
                orderUrl: `${this.getMarketplaceUrl()}/orders/${updated.id}`,
                status: 'cancelled'
            };

            await this.notificationsService.sendOrderStatusUpdateEmail(emailData);
        } catch (emailError) {
            // Log email errors but don't fail the cancellation
            this.logger.error(`Failed to send cancellation email: ${emailError.message}`);
        }

        return updated;
    }
}

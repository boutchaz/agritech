import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Req,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Controller('marketplace/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    private extractToken(request: Request): string {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
        return authHeader.split(' ')[1];
    }

    /**
     * Create a new order from cart
     */
    @Post()
    async createOrder(@Req() request: Request, @Body() dto: CreateOrderDto) {
        const token = this.extractToken(request);
        return this.ordersService.createOrder(token, dto);
    }

    /**
     * Get all orders for the current user
     */
    @Get()
    async getOrders(
        @Req() request: Request,
        @Query('role') role?: 'buyer' | 'seller'
    ) {
        const token = this.extractToken(request);
        return this.ordersService.getOrders(token, role);
    }

    /**
     * Get a single order by ID
     */
    @Get(':id')
    async getOrder(@Req() request: Request, @Param('id') id: string) {
        const token = this.extractToken(request);
        return this.ordersService.getOrder(token, id);
    }

    /**
     * Update order status (for sellers)
     */
    @Patch(':id/status')
    async updateOrderStatus(
        @Req() request: Request,
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto
    ) {
        const token = this.extractToken(request);
        return this.ordersService.updateOrderStatus(token, id, dto);
    }

    /**
     * Cancel an order (for buyers)
     */
    @Post(':id/cancel')
    async cancelOrder(@Req() request: Request, @Param('id') id: string) {
        const token = this.extractToken(request);
        return this.ordersService.cancelOrder(token, id);
    }
}

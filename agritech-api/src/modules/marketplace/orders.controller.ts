import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Controller('marketplace/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    /**
     * Create a new order from cart
     */
    @Post()
    @UseGuards(JwtAuthGuard)
    async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
        const token = req.headers.authorization?.substring(7);
        return this.ordersService.createOrder(token, dto);
    }

    /**
     * Get all orders for the current user
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getOrders(
        @Request() req: any,
        @Query('role') role?: 'buyer' | 'seller'
    ) {
        const token = req.headers.authorization?.substring(7);
        return this.ordersService.getOrders(token, role);
    }

    /**
     * Get a single order by ID
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getOrder(@Request() req: any, @Param('id') id: string) {
        const token = req.headers.authorization?.substring(7);
        return this.ordersService.getOrder(token, id);
    }

    /**
     * Update order status (for sellers)
     */
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateOrderStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto
    ) {
        const token = req.headers.authorization?.substring(7);
        return this.ordersService.updateOrderStatus(token, id, dto);
    }

    /**
     * Cancel an order (for buyers)
     */
    @Post(':id/cancel')
    @UseGuards(JwtAuthGuard)
    async cancelOrder(@Request() req: any, @Param('id') id: string) {
        const token = req.headers.authorization?.substring(7);
        return this.ordersService.cancelOrder(token, id);
    }
}

import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';
import { DatabaseModule } from '../database/database.module';
import { StrapiModule } from '../strapi/strapi.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [DatabaseModule, StrapiModule, NotificationsModule],
    controllers: [MarketplaceController, CartController, OrdersController, SellersController, QuoteRequestsController],
    providers: [MarketplaceService, CartService, OrdersService, SellersService, QuoteRequestsService],
    exports: [MarketplaceService, CartService, OrdersService, SellersService, QuoteRequestsService],
})
export class MarketplaceModule { }

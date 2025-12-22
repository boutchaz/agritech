import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { DatabaseModule } from '../database/database.module';
import { StrapiModule } from '../strapi/strapi.module';

@Module({
    imports: [DatabaseModule, StrapiModule],
    controllers: [MarketplaceController, CartController, OrdersController, SellersController],
    providers: [MarketplaceService, CartService, OrdersService, SellersService],
    exports: [MarketplaceService, CartService, OrdersService, SellersService],
})
export class MarketplaceModule { }

import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { DatabaseModule } from '../database/database.module';
import { StrapiModule } from '../strapi/strapi.module';

@Module({
    imports: [DatabaseModule, StrapiModule],
    controllers: [MarketplaceController],
    providers: [MarketplaceService],
    exports: [MarketplaceService],
})
export class MarketplaceModule { }

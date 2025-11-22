import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { CaslModule } from '../casl/casl.module';

@Module({
    imports: [DatabaseModule, FarmsModule, ParcelsModule, CaslModule],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }

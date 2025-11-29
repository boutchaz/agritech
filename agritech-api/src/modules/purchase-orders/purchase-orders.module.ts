import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [DatabaseModule, SequencesModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}

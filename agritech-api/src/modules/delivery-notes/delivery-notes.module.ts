import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';
import { DeliveryNotesService } from './delivery-notes.service';
import { DeliveryNotesController } from './delivery-notes.controller';

@Module({
  imports: [
    DatabaseModule,
    SequencesModule,
    forwardRef(() => StockEntriesModule),
    SalesOrdersModule,
  ],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService],
  exports: [DeliveryNotesService],
})
export class DeliveryNotesModule {}

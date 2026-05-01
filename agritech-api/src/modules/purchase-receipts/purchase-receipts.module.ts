import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import { PurchaseReceiptsController } from './purchase-receipts.controller';

@Module({
  imports: [DatabaseModule, SequencesModule, forwardRef(() => StockEntriesModule)],
  controllers: [PurchaseReceiptsController],
  providers: [PurchaseReceiptsService],
  exports: [PurchaseReceiptsService],
})
export class PurchaseReceiptsModule {}

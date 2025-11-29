import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { SequenceModule } from '../../common/sequence/sequence.module';

@Module({
  imports: [SupabaseModule, SequenceModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}

import { Module } from '@nestjs/common';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { SequenceModule } from '../../common/sequence/sequence.module';

@Module({
  imports: [SupabaseModule, SequenceModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

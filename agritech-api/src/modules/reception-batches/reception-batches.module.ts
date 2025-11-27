import { Module } from '@nestjs/common';
import { ReceptionBatchesController } from './reception-batches.controller';
import { ReceptionBatchesService } from './reception-batches.service';

@Module({
  controllers: [ReceptionBatchesController],
  providers: [ReceptionBatchesService],
  exports: [ReceptionBatchesService],
})
export class ReceptionBatchesModule {}
